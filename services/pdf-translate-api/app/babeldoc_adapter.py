from __future__ import annotations

import os
import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

from app.schemas import OutputMode
from app.settings import settings


class BabelDocError(RuntimeError):
    pass


@dataclass(slots=True)
class BabelDocResult:
    file_bytes: bytes
    output_filename: str


def _language_is_valid(token: str) -> bool:
    return token.isascii() and token.replace("-", "").isalnum()


def _build_command(
    source_pdf: Path,
    working_dir: Path,
    source_lang: str,
    target_lang: str,
    output_mode: OutputMode,
) -> list[str]:
    if not _language_is_valid(source_lang) or not _language_is_valid(target_lang):
        raise BabelDocError("Invalid language token.")

    command = [
        settings.babeldoc_bin,
        str(source_pdf),
        "--lang-in",
        source_lang,
        "--lang-out",
        target_lang,
        "--working-dir",
        str(working_dir),
    ]

    if output_mode == OutputMode.translated:
        command.append("--no-dual")
    else:
        command.append("--no-mono")

    extra_args = settings.babeldoc_extra_args.strip()
    if extra_args:
        command.extend(shlex.split(extra_args))

    return command


def _collect_output_candidates(working_dir: Path) -> list[Path]:
    return sorted(
        [path for path in working_dir.rglob("*.pdf") if path.is_file()],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def _pick_output_file(
    candidates: list[Path], source_pdf: Path, output_mode: OutputMode
) -> Path | None:
    if not candidates:
        return None

    source_name = source_pdf.name.lower()
    filtered = [path for path in candidates if path.name.lower() != source_name]
    if not filtered:
        filtered = candidates

    if output_mode == OutputMode.bilingual:
        preferred = [
            path
            for path in filtered
            if "dual" in path.name.lower() or "bilingual" in path.name.lower()
        ]
        if preferred:
            return preferred[0]
    else:
        preferred = [
            path
            for path in filtered
            if "mono" in path.name.lower() or "translated" in path.name.lower()
        ]
        if preferred:
            return preferred[0]

    return filtered[0]


def translate_pdf(
    source_pdf_bytes: bytes,
    source_filename: str,
    source_lang: str,
    target_lang: str,
    output_mode: OutputMode,
) -> BabelDocResult:
    if not source_pdf_bytes:
        raise BabelDocError("Empty source PDF file.")

    settings.babeldoc_work_root.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(
        prefix="job-", dir=str(settings.babeldoc_work_root)
    ) as job_dir_raw:
        job_dir = Path(job_dir_raw)
        source_pdf = job_dir / (Path(source_filename).name or "source.pdf")
        source_pdf.write_bytes(source_pdf_bytes)

        command = _build_command(
            source_pdf=source_pdf,
            working_dir=job_dir,
            source_lang=source_lang,
            target_lang=target_lang,
            output_mode=output_mode,
        )

        env = os.environ.copy()
        if settings.openai_api_key:
            env["OPENAI_API_KEY"] = settings.openai_api_key
        if settings.openai_base_url:
            env["OPENAI_BASE_URL"] = settings.openai_base_url
        if settings.openai_model:
            env["OPENAI_MODEL"] = settings.openai_model

        try:
            completed = subprocess.run(
                command,
                cwd=str(job_dir),
                env=env,
                capture_output=True,
                text=True,
                timeout=settings.babeldoc_timeout_seconds,
                check=False,
            )
        except FileNotFoundError as error:
            raise BabelDocError(
                f"BabelDOC binary not found: {settings.babeldoc_bin}"
            ) from error
        except subprocess.TimeoutExpired as error:
            raise BabelDocError("BabelDOC translation timed out.") from error

        if completed.returncode != 0:
            stderr = completed.stderr.strip()
            stdout = completed.stdout.strip()
            detail = stderr or stdout or "BabelDOC returned non-zero exit code."
            raise BabelDocError(detail)

        candidates = _collect_output_candidates(job_dir)
        output_file = _pick_output_file(
            candidates=candidates,
            source_pdf=source_pdf,
            output_mode=output_mode,
        )
        if output_file is None:
            raise BabelDocError("No translated PDF produced by BabelDOC.")

        mode_suffix = "bilingual" if output_mode == OutputMode.bilingual else "translated"
        output_filename = (
            f"{Path(source_filename).stem or 'document'}.{mode_suffix}.pdf"
        )
        return BabelDocResult(
            file_bytes=output_file.read_bytes(),
            output_filename=output_filename,
        )
