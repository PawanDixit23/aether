"""
Document Parser Module for Aether
Supports extraction of text from PDF, DOCX, DOC, TXT, MD, CSV, JSON, RTF, and general text/code files.
"""

import io
import os
import re
import subprocess
from typing import Dict, Any, Tuple

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None


def extract_pdf(content_bytes: bytes) -> Tuple[str, int]:
    if not pypdf:
        raise RuntimeError("pypdf is not installed")
    reader = pypdf.PdfReader(io.BytesIO(content_bytes))
    num_pages = len(reader.pages)
    text_parts = []
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            text_parts.append(f"--- Page {i+1} ---\n{page_text.strip()}")
    return "\n\n".join(text_parts), num_pages


def extract_docx(content_bytes: bytes) -> Tuple[str, int]:
    if not docx:
        raise RuntimeError("python-docx is not installed")
    doc = docx.Document(io.BytesIO(content_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    table_texts = []
    for table in doc.tables:
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_cells:
                table_texts.append(" | ".join(row_cells))
    full_text = "\n\n".join(paragraphs)
    if table_texts:
        full_text += "\n\n--- Tables ---\n" + "\n".join(table_texts)
    return full_text, 1


def extract_with_textutil(content_bytes: bytes) -> Tuple[str, int]:
    """macOS textutil fallback for .doc, .rtf, .odt, .html"""
    try:
        proc = subprocess.run(
            ["/usr/bin/textutil", "-convert", "txt", "-stdin", "-stdout"],
            input=content_bytes,
            capture_output=True,
            timeout=5,
            check=True
        )
        out = proc.stdout.decode("utf-8", errors="replace").strip()
        return out, 1
    except Exception:
        return "", 0


def extract_plain_text(content_bytes: bytes) -> Tuple[str, int]:
    encodings = ["utf-8", "utf-8-sig", "utf-16", "latin-1", "cp1252", "iso-8859-1"]
    for enc in encodings:
        try:
            return content_bytes.decode(enc).strip(), 1
        except (UnicodeDecodeError, LookupError):
            continue
    return content_bytes.decode("utf-8", errors="replace").strip(), 1


def extract_text_from_file(filename: str, content_bytes: bytes) -> Dict[str, Any]:
    """
    Extract readable text from file bytes according to filename extension.
    Supported: .pdf, .docx, .doc, .txt, .md, .csv, .json, .rtf, .log, .tsv, etc.
    """
    ext = os.path.splitext(filename.lower())[1]
    text = ""
    pages = 1
    err_msg = None

    try:
        if ext == ".pdf":
            text, pages = extract_pdf(content_bytes)
        elif ext in [".docx", ".docm"]:
            text, pages = extract_docx(content_bytes)
        elif ext in [".doc", ".rtf"]:
            text, pages = extract_with_textutil(content_bytes)
            if not text:
                text, pages = extract_plain_text(content_bytes)
        else:
            # Common text/data formats: .txt, .md, .csv, .tsv, .json, .log, .py, etc.
            text, pages = extract_plain_text(content_bytes)
            
        if not text and len(content_bytes) > 0:
            # Fallback printable strings extraction
            matches = re.findall(rb'[\x20-\x7E\t\r\n]{4,}', content_bytes)
            text = b"\n".join(matches).decode("ascii", errors="replace").strip()

    except Exception as e:
        err_msg = str(e)
        try:
            text, pages = extract_plain_text(content_bytes)
        except Exception:
            text = ""

    words = len(text.split()) if text else 0
    chars = len(text) if text else 0

    return {
        "filename": filename,
        "extension": ext,
        "text": text,
        "pages": pages,
        "word_count": words,
        "character_count": chars,
        "success": bool(text.strip()),
        "error": err_msg if not text.strip() else None
    }

