import pymupdf  # PyMuPDF
import pytesseract
from pdf2image import convert_from_path
import os
from typing import Dict, List

# Extraction configuration
MIN_TEXT_LENGTH = 300
OCR_DPI = 300

def extract_links(pdf_path: str) -> List[str]:
    """Gen4 Feature: Extracts embedded clickable URIs (links) from the PDF."""
    links = []
    try:
        doc = pymupdf.open(pdf_path)
        for page in doc:
            link_dicts = page.get_links()
            for link in link_dicts:
                if 'uri' in link:
                    links.append(link['uri'])
        doc.close()
    except Exception as e:
        print(f"   ⚠️ Link Extraction Error: {e}")
    return list(set(links))

def extract_text_native(pdf_path: str) -> str:
    """Extracts text directly from selectable PDF layers."""
    text = ""
    try:
        doc = pymupdf.open(pdf_path)
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
    except: return ""
    return text.strip()

def extract_text_ocr(pdf_path: str) -> str:
    """Fallback OCR extraction for scanned resume images."""
    text = ""
    try:
        images = convert_from_path(pdf_path, dpi=OCR_DPI)
        for img in images:
            text += pytesseract.image_to_string(img) + "\n"
    except: return ""
    return text.strip()

def ingest_resume(pdf_path: str) -> Dict:
    """Unified ingestion pipeline for text and digital footprint (URLs)."""
    native_text = extract_text_native(pdf_path)
    links = extract_links(pdf_path)

    if len(native_text) >= MIN_TEXT_LENGTH:
        used_ocr = False
        final_text = native_text
    else:
        ocr_text = extract_text_ocr(pdf_path)
        used_ocr = True
        final_text = ocr_text if len(ocr_text) > len(native_text) else native_text

    return {
        "text": final_text,
        "links": links,
        "used_ocr": used_ocr
    }