import re
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, date
from pdfminer.high_level import extract_text
from docx import Document
import logging
logger = logging.getLogger(__name__)
class ReportParser:
    SYSTEMS = {
        'FORTISIEM': 'fortisiem',
        'FORTISANDBOX': 'fortisandbox',
        'FORTICLIENT EMS': 'forticlient_ems',
        'FORTIANALYZER': 'fortianalyzer',
        'FORTIEDR': 'fortiedr',
        'ESET SOC': 'eset_soc',
        'ESET BIENESTAR': 'eset_bienestar',
        'CORREO POLICIAL': 'correo_policial',
        'OTRAS NOVEDADES': 'otras_novedades',
        'NOVEDADES GENERALES': 'otras_novedades'
    }
    def extract_date_from_str(self, text: str) -> Optional[date]:
        # Look for DD-MM-YYYY or DD/MM/YYYY
        match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', text)
        if match:
            try:
                day, month, year = map(int, match.groups())
                return date(year, month, day)
            except ValueError:
                return None
        return None
    def extract_shift_from_str(self, text: str) -> str:
        upper_text = text.upper()
        if "NOCHE" in upper_text:
            return "NOCHE"
        return "DIA" # Default
    def parse_file(self, file_path: str, file_ext: str, filename: str = "") -> Tuple[Dict[str, Any], Optional[date], str]:
        text = ""
        detected_date = self.extract_date_from_str(filename)
        detected_shift = self.extract_shift_from_str(filename)
        if file_ext == '.pdf':
            text = extract_text(file_path)
        elif file_ext in ['.docx', '.doc']:
            doc = Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs])
        else:
            raise ValueError("Unsupported file format")
        # If date not in filename, look in content
        if not detected_date:
            detected_date = self.extract_date_from_str(text)
        # If shift is default (DIA) from filename, double check content just in case
        if detected_shift == "DIA":
             if "NOCHE" in text.upper():
                 detected_shift = "NOCHE"
        parsed_data = self._parse_text(text)
        return parsed_data, detected_date, detected_shift
    def _parse_text(self, text: str) -> Dict[str, Any]:
        data = {}
        lines = text.split('\n')
        current_system = None
        current_field = None # 'obs' or 'health'
        buffer = []
        # Normalize text for keyword search
        normalized_lines = [line.strip() for line in lines if line.strip()]
        for line in normalized_lines:
            upper_line = line.upper()
            # Check if line matches a system header
            found_system = False
            for sys_key, sys_val in self.SYSTEMS.items():
                if sys_key in upper_line:
                    # Save previous buffer
                    if current_system and current_field:
                        field_name = f"{current_system}_{current_field}"
                        if field_name not in data: # Don't overwrite if already found (simple logic)
                            data[field_name] = "\n".join(buffer).strip()
                    # Start new system
                    current_system = sys_val
                    current_field = 'obs' # Default to obs
                    buffer = []
                    found_system = True
                    break
            if found_system:
                continue
            # Check for fields within system
            if 'ESTADO DE SALUD' in upper_line or 'SALUD' in upper_line:
                if current_system:
                    # Save obs buffer
                    data[f"{current_system}_obs"] = "\n".join(buffer).strip()
                    current_field = 'health'
                    buffer = []
                    # Try to capture content on the same line "Estado de salud: Bien"
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        buffer.append(parts[1].strip())
                    continue
            if 'OBSERVACIONES' in upper_line:
                 if current_system:
                    # If we were in health, save it? Unlikely order, but possible.
                    if current_field == 'health':
                         data[f"{current_system}_health"] = "\n".join(buffer).strip()
                    current_field = 'obs'
                    buffer = []
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        buffer.append(parts[1].strip())
                    continue
            # Append content
            buffer.append(line)
        # Save last buffer
        if current_system and current_field:
            field_name = f"{current_system}_{current_field}"
            if field_name not in data:
                data[field_name] = "\n".join(buffer).strip()
        return data
