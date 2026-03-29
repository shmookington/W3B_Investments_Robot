#!/usr/bin/env python3
"""
MONOLITH RAG — Document Indexer

Reads all research documents, checklists, and architecture docs,
splits them into chunks, embeds them, and stores in ChromaDB.

Run this once to build the index, then again whenever you add new docs.

Usage:
    python indexer.py                    # Index all docs
    python indexer.py --force            # Re-index from scratch
    python indexer.py --dir /path/to/docs  # Custom docs directory
"""

import os
import sys
import hashlib
import argparse
from pathlib import Path

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# --- Configuration ---
DEFAULT_DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs')
DB_DIR = os.path.join(os.path.dirname(__file__), 'vector_db')
COLLECTION_NAME = 'monolith_knowledge'
EMBED_MODEL = 'all-MiniLM-L6-v2'  # Fast, free, runs locally, 384 dimensions
CHUNK_SIZE = 800       # characters per chunk (sweet spot for retrieval)
CHUNK_OVERLAP = 200    # overlap between chunks (maintains context across boundaries)


def split_into_chunks(text: str, source_file: str, chunk_size: int = CHUNK_SIZE, 
                      overlap: int = CHUNK_OVERLAP) -> list[dict]:
    """
    Split a document into overlapping chunks.
    Each chunk gets metadata: source file, section header, chunk index.
    """
    chunks = []
    lines = text.split('\n')
    
    current_chunk = []
    current_length = 0
    current_header = "Introduction"
    chunk_index = 0
    
    for line in lines:
        # Track the current section header
        if line.startswith('## '):
            current_header = line.strip('# ').strip()
        elif line.startswith('### '):
            current_header = line.strip('# ').strip()
        
        current_chunk.append(line)
        current_length += len(line) + 1  # +1 for newline
        
        if current_length >= chunk_size:
            chunk_text = '\n'.join(current_chunk)
            
            chunks.append({
                'text': chunk_text,
                'source': source_file,
                'section': current_header,
                'chunk_index': chunk_index,
                'id': f"{source_file}::chunk_{chunk_index}"
            })
            
            # Keep the overlap
            overlap_lines = []
            overlap_length = 0
            for prev_line in reversed(current_chunk):
                overlap_length += len(prev_line) + 1
                overlap_lines.insert(0, prev_line)
                if overlap_length >= overlap:
                    break
            
            current_chunk = overlap_lines
            current_length = overlap_length
            chunk_index += 1
    
    # Don't forget the last chunk
    if current_chunk:
        chunk_text = '\n'.join(current_chunk)
        if len(chunk_text.strip()) > 50:  # Skip tiny trailing chunks
            chunks.append({
                'text': chunk_text,
                'source': source_file,
                'section': current_header,
                'chunk_index': chunk_index,
                'id': f"{source_file}::chunk_{chunk_index}"
            })
    
    return chunks


def find_all_docs(docs_dir: str) -> list[Path]:
    """Find all markdown files in the docs directory (recursive)."""
    docs_path = Path(docs_dir).resolve()
    md_files = sorted(docs_path.rglob('*.md'))
    return md_files


def compute_file_hash(filepath: Path) -> str:
    """Compute MD5 hash of file contents for change detection."""
    return hashlib.md5(filepath.read_bytes()).hexdigest()


def index_documents(docs_dir: str, force: bool = False):
    """Main indexing pipeline."""
    
    print("=" * 60)
    print("  MONOLITH RAG — Document Indexer")
    print("=" * 60)
    
    # 1. Find all documents
    docs = find_all_docs(docs_dir)
    print(f"\n📁 Found {len(docs)} markdown files in {docs_dir}")
    
    if not docs:
        print("❌ No documents found. Check the path.")
        sys.exit(1)
    
    # 2. Initialize the embedding model
    print(f"\n🧠 Loading embedding model: {EMBED_MODEL}")
    model = SentenceTransformer(EMBED_MODEL)
    print("   ✅ Model loaded")
    
    # 3. Initialize ChromaDB
    os.makedirs(DB_DIR, exist_ok=True)
    client = chromadb.PersistentClient(path=DB_DIR)
    
    if force:
        # Delete existing collection if forcing re-index
        try:
            client.delete_collection(COLLECTION_NAME)
            print("   🗑️  Deleted existing collection (--force)")
        except Exception:
            pass
    
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "MONOLITH research and architecture knowledge base"}
    )
    
    existing_count = collection.count()
    print(f"   📊 Existing chunks in DB: {existing_count}")
    
    # 4. Process each document
    total_chunks = 0
    new_chunks = 0
    
    for doc_path in docs:
        relative_path = str(doc_path.relative_to(Path(docs_dir).resolve()))
        
        try:
            content = doc_path.read_text(encoding='utf-8')
        except Exception as e:
            print(f"   ⚠️  Skipping {relative_path}: {e}")
            continue
        
        if len(content.strip()) < 100:
            continue  # Skip near-empty files
        
        # Split into chunks
        chunks = split_into_chunks(content, relative_path)
        total_chunks += len(chunks)
        
        # Prepare batch data
        ids = [c['id'] for c in chunks]
        documents = [c['text'] for c in chunks]
        metadatas = [{'source': c['source'], 'section': c['section'], 
                      'chunk_index': c['chunk_index']} for c in chunks]
        
        # Embed and upsert
        embeddings = model.encode(documents).tolist()
        
        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        
        new_chunks += len(chunks)
        print(f"   ✅ {relative_path} → {len(chunks)} chunks")
    
    # 5. Summary
    final_count = collection.count()
    print(f"\n{'=' * 60}")
    print(f"  ✅ Indexing complete!")
    print(f"  📄 Documents processed: {len(docs)}")
    print(f"  🧩 Total chunks: {final_count}")
    print(f"  💾 Database: {DB_DIR}")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='MONOLITH RAG Document Indexer')
    parser.add_argument('--dir', default=DEFAULT_DOCS_DIR, 
                        help='Directory containing documents to index')
    parser.add_argument('--force', action='store_true',
                        help='Force re-index from scratch')
    args = parser.parse_args()
    
    index_documents(args.dir, args.force)
