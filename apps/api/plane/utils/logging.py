# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import logging.handlers as handlers
import time

from pythonjsonlogger.jsonlogger import JsonFormatter


DEFAULT_JSON_FMT = "%(levelname)s %(asctime)s %(module)s %(name)s %(message)s"


class PlaneJsonFormatter(JsonFormatter):
    """
    Single-line JSON for containers and log aggregators: UTC timestamp field,
    common `level` / `logger` keys, and UTF-8 text without unnecessary escaping.
    `extra={...}` on log calls is merged into the JSON by python-json-logger.
    """

    def __init__(
        self,
        fmt: str | None = None,
        datefmt: str | None = None,
        *,
        timestamp: bool | str = True,
        rename_fields: dict[str, str] | None = None,
        json_ensure_ascii: bool = False,
        **kwargs,
    ) -> None:
        merged_rename = {"levelname": "level", "name": "logger"}
        if rename_fields:
            merged_rename.update(rename_fields)
        super().__init__(
            fmt or DEFAULT_JSON_FMT,
            datefmt,
            timestamp=timestamp,
            rename_fields=merged_rename,
            json_ensure_ascii=json_ensure_ascii,
            **kwargs,
        )


class SizedTimedRotatingFileHandler(handlers.TimedRotatingFileHandler):
    """
    Handler for logging to a set of files, which switches from one file
    to the next when the current file reaches a certain size, or at certain
    timed intervals
    """

    def __init__(
        self,
        filename,
        maxBytes=0,
        backupCount=0,
        encoding=None,
        delay=0,
        when="h",
        interval=1,
        utc=False,
    ):
        handlers.TimedRotatingFileHandler.__init__(self, filename, when, interval, backupCount, encoding, delay, utc)
        self.maxBytes = maxBytes

    def shouldRollover(self, record):
        """
        Determine if rollover should occur.

        Basically, see if the supplied record would cause the file to exceed
        the size limit we have.
        """
        if self.stream is None:  # delay was set...
            self.stream = self._open()
        if self.maxBytes > 0:  # are we rolling over?
            msg = "%s\n" % self.format(record)
            # due to non-posix-compliant Windows feature
            self.stream.seek(0, 2)
            if self.stream.tell() + len(msg) >= self.maxBytes:
                return 1
        t = int(time.time())
        if t >= self.rolloverAt:
            return 1
        return 0
