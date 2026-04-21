import io
import logging
from contextlib import asynccontextmanager

import numpy as np
import scipy.io.wavfile
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from scipy.signal import butter, sosfilt
from transformers import AutoProcessor, MusicgenForConditionalGeneration

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model references (set on startup)
model = None
processor = None
device = None
sampling_rate = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, processor, device, sampling_rate

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model_id = "facebook/musicgen-large"

    logger.info(f"Loading MusicGen model '{model_id}' on {device}...")
    processor = AutoProcessor.from_pretrained(model_id)
    model = MusicgenForConditionalGeneration.from_pretrained(model_id).to(device)
    sampling_rate = model.config.audio_encoder.sampling_rate
    logger.info(f"Model loaded. Sampling rate: {sampling_rate} Hz")

    yield

    logger.info("Shutting down")
    del model, processor


app = FastAPI(
    title="AudioXGen API",
    description="Generate music tracks from text prompts using MusicGen",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request schema
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Text description of the desired audio")
    genre: str = Field(default="Synthwave", description="Music genre")
    emotion: str = Field(default="Energetic", description="Desired mood / emotion")
    duration: int = Field(default=30, ge=10, le=300, description="Target duration in seconds")
    guidance_scale: float = Field(default=5.0, ge=1.0, le=15.0, description="Prompt adherence strength")
    temperature: float = Field(default=0.8, ge=0.1, le=2.0, description="Sampling temperature")


# Audio helpers

def equal_power_crossfade(prev_tail: np.ndarray, new_head: np.ndarray, length: int) -> np.ndarray:
    # Cosine equal-power crossfade for energy-preserving blend
    t = np.linspace(0, np.pi / 2, length)
    return prev_tail * np.cos(t) + new_head * np.sin(t)


def rms_normalize(audio: np.ndarray, target_rms: float = 0.1) -> np.ndarray:
    # Normalize audio to a target RMS level
    rms = np.sqrt(np.mean(audio ** 2))
    if rms > 1e-6:
        audio = audio * (target_rms / rms)
    return audio


def postprocess_audio(audio: np.ndarray, sr: int) -> np.ndarray:
    # DC offset removal
    audio = audio - np.mean(audio)

    # High-pass filter at 20 Hz (remove sub-bass rumble)
    sos = butter(4, 20, btype="high", fs=sr, output="sos")
    audio = sosfilt(sos, audio).astype(np.float32)

    # Soft limiter via tanh
    drive = 1.5
    audio = np.tanh(audio * drive) / np.tanh(drive)

    # Peak normalize to -1 dBFS
    peak = np.max(np.abs(audio))
    if peak > 1e-6:
        audio = audio * (10 ** (-1.0 / 20.0)) / peak

    # Fade-in and fade-out
    fade_in_len = int(0.5 * sr)
    fade_out_len = int(2.0 * sr)
    if len(audio) > fade_in_len:
        audio[:fade_in_len] *= np.linspace(0, 1, fade_in_len)
    if len(audio) > fade_out_len:
        audio[-fade_out_len:] *= np.linspace(1, 0, fade_out_len)

    return audio


# Core generation logic

def generate_audio(
    full_prompt: str,
    duration_sec: int,
    guidance_scale: float,
    temperature: float,
) -> np.ndarray:
    prompt_duration_sec = 5
    segment_duration_sec = 20
    overlap_duration_sec = 2.0
    target_rms = 0.1

    overlap_samples = int(overlap_duration_sec * sampling_rate)
    tokens_per_step = int((segment_duration_sec + overlap_duration_sec) * 50)
    prompt_samples = int(prompt_duration_sec * sampling_rate)

    all_audio = []
    total_samples = 0

    # Initial segment
    initial_tokens = int(min(segment_duration_sec, duration_sec) * 50)
    inputs = processor(
        text=[full_prompt],
        padding=True,
        return_tensors="pt",
    ).to(device)

    logger.info(f"Generating initial segment ({min(segment_duration_sec, duration_sec)}s)...")
    audio_values = model.generate(
        **inputs,
        max_new_tokens=initial_tokens,
        guidance_scale=guidance_scale,
        do_sample=True,
        temperature=temperature,
    )
    current_audio = audio_values[0, 0].cpu().numpy()
    current_audio = rms_normalize(current_audio, target_rms)
    all_audio.append(current_audio)
    total_samples += len(current_audio)

    # Continuation segments with overlap crossfade
    target_samples = int(duration_sec * sampling_rate)
    while total_samples < target_samples:
        current_sec = total_samples / sampling_rate
        logger.info(f"Generating continuation ({current_sec:.1f}s / {duration_sec}s)...")

        audio_prompt = all_audio[-1][-prompt_samples:]

        inputs = processor(
            audio=audio_prompt,
            sampling_rate=sampling_rate,
            text=[full_prompt],
            padding=True,
            return_tensors="pt",
        ).to(device)

        audio_values = model.generate(
            **inputs,
            max_new_tokens=tokens_per_step,
            guidance_scale=guidance_scale,
            do_sample=True,
            temperature=temperature,
        )
        new_segment = audio_values[0, 0].cpu().numpy()
        new_segment = rms_normalize(new_segment, target_rms)

        # Equal-power crossfade at the overlap boundary
        if len(all_audio[-1]) >= overlap_samples and len(new_segment) >= overlap_samples:
            prev_tail = all_audio[-1][-overlap_samples:]
            new_head = new_segment[:overlap_samples]
            blended = equal_power_crossfade(prev_tail, new_head, overlap_samples)

            all_audio[-1] = all_audio[-1][:-overlap_samples]
            total_samples -= overlap_samples
            new_segment = np.concatenate([blended, new_segment[overlap_samples:]])

        all_audio.append(new_segment)
        total_samples += len(new_segment)

    # Combine, trim, postprocess
    final_audio = np.concatenate(all_audio)
    if len(final_audio) > target_samples:
        final_audio = final_audio[:target_samples]

    final_audio = postprocess_audio(final_audio, sampling_rate)
    return final_audio


def audio_to_wav_bytes(audio: np.ndarray, sr: int) -> bytes:
    buf = io.BytesIO()
    scipy.io.wavfile.write(buf, rate=sr, data=audio)
    buf.seek(0)
    return buf.read()


# Endpoints

@app.get("/")
async def root():
    return {
        "message": "AudioXGen API is running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "device": str(device),
    }


@app.post("/generate")
async def generate(req: GenerateRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    full_prompt = f"{req.genre} track with {req.emotion} mood. {req.prompt}"
    logger.info(f"Generating: prompt='{full_prompt}', duration={req.duration}s")

    try:
        audio = generate_audio(
            full_prompt=full_prompt,
            duration_sec=req.duration,
            guidance_scale=req.guidance_scale,
            temperature=req.temperature,
        )
    except Exception as e:
        logger.exception("Generation failed")
        raise HTTPException(status_code=500, detail=str(e))

    wav_bytes = audio_to_wav_bytes(audio, sampling_rate)

    return StreamingResponse(
        io.BytesIO(wav_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'attachment; filename="audioxgen_{req.genre.lower()}_{req.duration}s.wav"',
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
