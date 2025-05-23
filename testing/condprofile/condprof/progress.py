"""
clint.textui.progress
~~~~~~~~~~~~~~~~~
This module provides the progressbar functionality.


ISC License

Copyright (c) 2011, Kenneth Reitz <me@kennethreitz.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
"""

import sys
import time

STREAM = sys.stderr

BAR_TEMPLATE = "%s[%s%s] %i/%i - %s\r"
MILL_TEMPLATE = "%s %s %i/%i\r"

DOTS_CHAR = "."
BAR_FILLED_CHAR = "#"
BAR_EMPTY_CHAR = " "
MILL_CHARS = ["|", "/", "-", "\\"]

# How long to wait before recalculating the ETA
ETA_INTERVAL = 1
# How many intervals (excluding the current one) to calculate the simple moving
# average
ETA_SMA_WINDOW = 9


class Bar:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.done()
        return False  # we're not suppressing exceptions

    def __init__(
        self,
        label="",
        width=32,
        hide=None,
        empty_char=BAR_EMPTY_CHAR,
        filled_char=BAR_FILLED_CHAR,
        expected_size=None,
        every=1,
    ):
        self.label = label
        self.width = width
        self.hide = hide
        # Only show bar in terminals by default (better for piping, logging etc.)
        if hide is None:
            try:
                self.hide = not STREAM.isatty()
            except AttributeError:  # output does not support isatty()
                self.hide = True
        self.empty_char = empty_char
        self.filled_char = filled_char
        self.expected_size = expected_size
        self.every = every
        self.start = time.time()
        self.ittimes = []
        self.eta = 0
        self.etadelta = time.time()
        self.etadisp = self.format_time(self.eta)
        self.last_progress = 0
        if self.expected_size:
            self.show(0)

    def show(self, progress, count=None):
        if count is not None:
            self.expected_size = count
        if self.expected_size is None:
            raise Exception("expected_size not initialized")
        self.last_progress = progress
        if (time.time() - self.etadelta) > ETA_INTERVAL:
            self.etadelta = time.time()
            # pylint --py3k W1619
            self.ittimes = self.ittimes[-ETA_SMA_WINDOW:] + [
                -(self.start - time.time()) / (progress + 1)
            ]
            self.eta = (
                sum(self.ittimes)
                / float(len(self.ittimes))
                * (self.expected_size - progress)
            )
            self.etadisp = self.format_time(self.eta)
        # pylint --py3k W1619
        x = int(self.width * progress / self.expected_size)
        if not self.hide:
            if (progress % self.every) == 0 or (  # True every "every" updates
                progress == self.expected_size
            ):  # And when we're done
                STREAM.write(
                    BAR_TEMPLATE
                    % (
                        self.label,
                        self.filled_char * x,
                        self.empty_char * (self.width - x),
                        progress,
                        self.expected_size,
                        self.etadisp,
                    )
                )
                STREAM.flush()

    def done(self):
        self.elapsed = time.time() - self.start
        elapsed_disp = self.format_time(self.elapsed)
        if not self.hide:
            # Print completed bar with elapsed time
            STREAM.write(
                BAR_TEMPLATE
                % (
                    self.label,
                    self.filled_char * self.width,
                    self.empty_char * 0,
                    self.last_progress,
                    self.expected_size,
                    elapsed_disp,
                )
            )
            STREAM.write("\n")
            STREAM.flush()

    def format_time(self, seconds):
        return time.strftime("%H:%M:%S", time.gmtime(seconds))


def bar(
    it,
    label="",
    width=32,
    hide=None,
    empty_char=BAR_EMPTY_CHAR,
    filled_char=BAR_FILLED_CHAR,
    expected_size=None,
    every=1,
):
    """Progress iterator. Wrap your iterables with it."""

    count = len(it) if expected_size is None else expected_size

    with Bar(
        label=label,
        width=width,
        hide=hide,
        empty_char=empty_char,
        filled_char=filled_char,
        expected_size=count,
        every=every,
    ) as bar:
        for i, item in enumerate(it):
            yield item
            bar.show(i + 1)


def dots(it, label="", hide=None, every=1):
    """Progress iterator. Prints a dot for each item being iterated"""

    count = 0

    if not hide:
        STREAM.write(label)

    for i, item in enumerate(it):
        if not hide:
            if i % every == 0:  # True every "every" updates
                STREAM.write(DOTS_CHAR)
                sys.stderr.flush()

        count += 1

        yield item

    STREAM.write("\n")
    STREAM.flush()


def mill(it, label="", hide=None, expected_size=None, every=1):
    """Progress iterator. Prints a mill while iterating over the items."""

    def _mill_char(_i):
        if _i >= count:
            return " "
        else:
            return MILL_CHARS[(_i // every) % len(MILL_CHARS)]

    def _show(_i):
        if not hide:
            if (_i % every) == 0 or (  # True every "every" updates
                _i == count
            ):  # And when we're done
                STREAM.write(MILL_TEMPLATE % (label, _mill_char(_i), _i, count))
                STREAM.flush()

    count = len(it) if expected_size is None else expected_size

    if count:
        _show(0)

    for i, item in enumerate(it):
        yield item
        _show(i + 1)

    if not hide:
        STREAM.write("\n")
        STREAM.flush()
