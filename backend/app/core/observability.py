import logging
import os
import sentry_sdk
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi import FastAPI
logger = logging.getLogger(__name__)
def setup_observability(app: FastAPI):
    """
    Configura Sentry (si está disponible) y Prometheus.
    """
    # 1. Configuración de Sentry
    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        logger.info("Initializing Sentry SDK...")
        sentry_sdk.init(
            dsn=sentry_dsn,
            # Set traces_sample_rate to 1.0 to capture 100%
            # of transactions for performance monitoring.
            traces_sample_rate=0.1,
            # Set profiles_sample_rate to 1.0 to profile 100%
            # of sampled transactions.
            profiles_sample_rate=0.1,
            environment=os.getenv("ENVIRONMENT", "production")
        )
    else:
        logger.info("Sentry DSN not found. Skipping Sentry initialization.")
    # 2. Configuración de Prometheus
    # Expone métricas en /metrics
    logger.info("Initializing Prometheus Instrumentator...")
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="inprogress",
        inprogress_labels=True,
    )
    instrumentator.instrument(app).expose(app)
