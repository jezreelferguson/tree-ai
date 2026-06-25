"""
Embedding service using HuggingFace sentence-transformers.
Uses all-MiniLM-L6-v2 (384 dimensions) — lightweight, fast, and free.
"""

from langchain_huggingface import HuggingFaceEmbeddings
from app.config.settings import EMBEDDING_MODEL

embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)
