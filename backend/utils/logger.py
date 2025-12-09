"""
Logging utility for backend.
"""

import logging
import sys
from pathlib import Path


def setup_logger(name: str) -> logging.Logger:
    """
    Setup logger with console and file handlers.
    
    TODO: Load configuration from settings
    TODO: Add rotating file handler
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    
    # TODO: Add file handler
    # TODO: Add rotating file handler for production
    
    return logger
