"""
Logging utility.
"""

import logging
import sys


def setup_logger(name: str) -> logging.Logger:
    """
    Setup logger with console handler.
    
    TODO: Add file handler
    TODO: Load log level from config
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    
    return logger
