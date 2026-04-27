from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from kokoro import KPipeline
import soundfile as sf
import os
import numpy as np
import torch
from dotenv import load_dotenv
from ddgs import DDGS
from groq import Groq

load_dotenv()

app = FastAPI(
    title="Kokoro TTS & AI Agent API",
    description="Combined TTS and Research Agent"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the pipeline once when the server starts
print("Loading Kokoro model...")
pipeline = KPipeline(lang_code='a')

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
ENABLE_WEB_SEARCH = os.getenv("ENABLE_WEB_SEARCH", "true").lower() in {"1", "true", "yes"}
SEARCH_RESULT_COUNT = int(os.getenv("SEARCH_RESULT_COUNT", "5"))

def get_groq_client():
    if not GROQ_API_KEY:
        return None

    return Groq(api_key=GROQ_API_KEY)


def fetch_web_context(query: str) -> str:
    if not ENABLE_WEB_SEARCH:
        return ""

    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=SEARCH_RESULT_COUNT)
    except Exception:
        return ""

    if not results:
        return ""

    lines = []
    for index, result in enumerate(results[:SEARCH_RESULT_COUNT], start=1):
        title = result.get("title", "").strip()
        body = result.get("body", "").strip()
        href = result.get("href", "").strip()
        snippet = f"{index}. {title}"
        if body:
            snippet += f" - {body}"
        if href:
            snippet += f" ({href})"
        lines.append(snippet)

    return "\n".join(lines)


def build_script_prompt(topic: str, web_context: str) -> str:
    sections = [
        "Write a high-quality, engaging script suitable for text-to-speech narration.",
        f"Topic: {topic}",
        "Requirements:",
        "- Be clear, well-paced, and informative.",
        "- Focus on a spoken narrative that flows naturally.",
        "- Keep the script factual and balanced.",
        "- Do not mention sources, bullet points, or stage directions in the final output.",
        "- Output only the final script text.",
    ]

    if web_context:
        sections.extend(
            [
                "",
                "Use the following web research context if it is relevant:",
                web_context,
            ]
        )

    return "\n".join(sections)


def generate_script_with_groq(topic: str) -> str:
    client = get_groq_client()
    if not client:
        raise RuntimeError("GROQ_API_KEY not found in environment. Please add it to .env file.")

    web_context = fetch_web_context(topic)
    prompt = build_script_prompt(topic, web_context)
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.7,
        max_tokens=1200,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a research assistant who writes polished, factual scripts for "
                    "text-to-speech narration. Return only the final script text."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    content = response.choices[0].message.content if response.choices else None
    if content and content.strip():
        return content.strip()
    raise RuntimeError("Groq did not return any script text.")

class TTSRequest(BaseModel):
    text: str
    voice: str = "af_bella"
    speed: float = 1.0

class AgentRequest(BaseModel):
    prompt: str

@app.get("/")
async def root():
    return {"message": "Kokoro TTS & AI Agent API is running!"}

@app.post("/agent/generate")
async def generate_script(request: AgentRequest):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="GROQ_API_KEY not found in environment. Please add it to .env file."
        )
    
    try:
        script = generate_script_with_groq(request.prompt)
        return {"success": True, "script": script}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent Error: {str(e)}")

@app.post("/tts")
async def generate_tts(request: TTSRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        results = list(pipeline(request.text, voice=request.voice, speed=request.speed))
        if not results:
            raise HTTPException(status_code=500, detail="No audio generated")
            
        audio_segments = []
        for r in results:
            if isinstance(r.audio, torch.Tensor):
                audio_segments.append(r.audio.numpy())
            else:
                audio_segments.append(r.audio)
        
        audio = np.concatenate(audio_segments)
        output_path = "output.wav"
        sf.write(output_path, audio, 24000)

        with open(output_path, "rb") as f:
            audio_bytes = f.read()

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "success": True,
            "audio_base64": audio_b64,
            "format": "wav",
            "voice_used": request.voice,
            "duration_seconds": round(len(audio) / 24000, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/voices")
async def get_voices():
    voices = [
        "af_bella", "af_sarah", "af_nicole", "af_sky", "af_heart",
        "am_adam", "am_michael", "bf_emma", "bf_isabella", "bm_george"
    ]
    return {"available_voices": voices}

