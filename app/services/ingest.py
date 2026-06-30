"""
Data ingestion pipeline.
Loads the WHO statistics PDF, chunks it, and upserts into Pinecone.
Run this script once (or whenever you update the data):

    python -m app.services.ingest
"""

import os
import sys

# Ensure project root is on the path when run as a script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config.settings import CHUNK_SIZE, CHUNK_OVERLAP
from app.services.pinecone_service import vector_store

# ── Paths 
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "docs")
PDF_PATH = os.path.join(DATA_DIR, "who-statistics.pdf")


def ingest_pdf(path: str = PDF_PATH):
    """Load a PDF, split into chunks, and upsert into Pinecone."""

    if not os.path.exists(path):
        print(f"ERROR: PDF not found at {path}")
        return

    print(f"Loading PDF: {path}")
    loader = PyPDFLoader(path)
    pages = loader.load()
    print(f"  → Loaded {len(pages)} pages")

    # ── Split into overlapping chunks 
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)
    print(f"  → Created {len(chunks)} text chunks")

    # Add source metadata to every chunk
    for i, chunk in enumerate(chunks):
        chunk.metadata["source"] = "WHO World Health Statistics"
        chunk.metadata["chunk_id"] = i

    # ── Upsert into Pinecone via LangChain 
    BATCH_SIZE = 50
    total = len(chunks)
    for start in range(0, total, BATCH_SIZE):
        end = min(start + BATCH_SIZE, total)
        batch = chunks[start:end]
        vector_store.add_documents(batch)
        print(f"  → Upserted batch {start // BATCH_SIZE + 1} ({end}/{total})")

    print("Ingestion complete!")


if __name__ == "__main__":
    ingest_pdf()
