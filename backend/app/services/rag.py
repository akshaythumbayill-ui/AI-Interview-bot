"""
FAISS-backed vector store for resume RAG.
- build_index()    : embed chunks and build a FAISS index for a session
- retrieve()       : return top-k chunks relevant to a query
- delete_index()   : clean up after session ends
"""

from __future__ import annotations
import logging
import os
import pickle
from typing import List, Optional

import numpy as np
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy imports — only needed when RAG is used
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(settings.embedding_model)
    return _embedder


def _index_path(session_id: str) -> str:
    os.makedirs(settings.faiss_index_dir, exist_ok=True)
    return os.path.join(settings.faiss_index_dir, f"{session_id}.pkl")


def build_index(session_id: str, chunks: List[str]) -> bool:
    """
    Embed resume chunks and persist a FAISS index to disk.
    Returns True on success, False if chunks are empty or on error.
    """
    if not chunks:
        return False
    try:
        import faiss

        model = _get_embedder()
        embeddings = model.encode(chunks, convert_to_numpy=True, normalize_embeddings=True)
        embeddings = embeddings.astype("float32")

        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)  # inner-product (cosine with normalized vecs)
        index.add(embeddings)

        payload = {"index": index, "chunks": chunks}
        with open(_index_path(session_id), "wb") as f:
            pickle.dump(payload, f)

        logger.info(f"Built FAISS index for session {session_id}: {len(chunks)} chunks")
        return True
    except Exception as e:
        logger.error(f"Failed to build FAISS index: {e}")
        return False


def retrieve(session_id: str, query: str, top_k: int = 3) -> str:
    """
    Retrieve the top-k most relevant resume chunks for a query.
    Returns a concatenated string, or empty string if no index exists.
    """
    path = _index_path(session_id)
    if not os.path.exists(path):
        return ""

    try:
        import faiss

        with open(path, "rb") as f:
            payload = pickle.load(f)

        index: faiss.IndexFlatIP = payload["index"]
        chunks: List[str] = payload["chunks"]

        model = _get_embedder()
        query_vec = model.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype("float32")
        distances, indices = index.search(query_vec, min(top_k, len(chunks)))

        results = [chunks[i] for i in indices[0] if i >= 0]
        return "\n---\n".join(results)
    except Exception as e:
        logger.error(f"RAG retrieval failed: {e}")
        return ""


def delete_index(session_id: str) -> None:
    """Remove the persisted FAISS index for a session."""
    path = _index_path(session_id)
    if os.path.exists(path):
        os.remove(path)
        logger.info(f"Deleted FAISS index for session {session_id}")
