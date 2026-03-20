# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import logging

# Third party imports
from celery import shared_task

# Module imports
from plane.db.models import FileAsset
from plane.settings.storage import S3Storage
from plane.utils.exception_logger import log_exception

logger = logging.getLogger(__name__)


def queue_get_asset_object_metadata(asset_id: str) -> None:
    """Enqueue storage metadata fetch; skip quietly if the Celery broker is unavailable."""
    try:
        get_asset_object_metadata.delay(str(asset_id))
    except Exception as exc:
        logger.warning("get_asset_object_metadata not queued (broker may be unavailable): %s", exc)


@shared_task
def get_asset_object_metadata(asset_id):
    try:
        # Get the asset
        asset = FileAsset.objects.get(pk=asset_id)
        # Create an instance of the S3 storage
        storage = S3Storage()
        # Get the storage
        asset.storage_metadata = storage.get_object_metadata(object_name=asset.asset.name)
        # Save the asset
        asset.save(update_fields=["storage_metadata"])
        return
    except FileAsset.DoesNotExist:
        return
    except Exception as e:
        log_exception(e)
        return
