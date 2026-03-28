"""
Path bootstrap for multi_agent sub-package.

Importing this module adds the parent ``scripts/`` directory to
``sys.path`` so that ``from common.<module> import ...`` works
when a script inside ``multi_agent/`` is executed directly.
"""

from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS_DIR = str(Path(__file__).resolve().parent.parent)

if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
