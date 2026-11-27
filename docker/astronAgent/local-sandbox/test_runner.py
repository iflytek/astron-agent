"""Exercise the runner request queue with overlapping ASGI requests."""

import asyncio
import os
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
import runner


class QueueTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        workspace = tempfile.TemporaryDirectory()
        self.addCleanup(workspace.cleanup)
        token_file = Path(workspace.name, "test-token")
        token = "sandbox-queue-test-token-for-runner"
        token_file.write_text(token)
        self.headers = {runner.TOKEN_HEADER: token}
        for patches in (
            patch.dict(
                os.environ, SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN_FILE=str(token_file)
            ),
            patch.multiple(
                runner,
                JOBCONTROL=Path(workspace.name),
                execution_slot=asyncio.Lock(),
                queued_requests=0,
                MAX_QUEUED_REQUESTS=2,
            ),
        ):
            patches.start()
            self.addCleanup(patches.stop)
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=runner.app), base_url="http://runner"
        )
        self.addAsyncCleanup(self.client.aclose)

    async def start_probe(self, label):
        return await self.client.post(
            "/v1/sandbox",
            headers=self.headers,
            json={"operation": "probe", "path": label},
        )

    async def test_overlapping_requests_wait_in_order_and_queue_is_bounded(self):
        started = threading.Event()
        arrivals = []

        def run_test_process(job, _identifier, _cancelled):
            arrivals.append(job.path)
            if job.path == "first":
                started.set()
                subprocess.run(["sleep", "2.1"], check=True)
            return 200, {"status": "ok"}

        with patch.object(runner, "run_job", side_effect=run_test_process):
            first = asyncio.create_task(self.start_probe("first"))
            self.assertTrue(await asyncio.to_thread(started.wait, 3))
            second = asyncio.create_task(self.start_probe("second"))
            while runner.queued_requests < 1:
                await asyncio.sleep(0)
            third = asyncio.create_task(self.start_probe("third"))
            while runner.queued_requests < 2:
                await asyncio.sleep(0)
            fourth = await self.start_probe("fourth")
            self.assertEqual(fourth.status_code, 503)
            results = await asyncio.gather(first, second, third)
            self.assertEqual([response.status_code for response in results], [200] * 3)
        self.assertEqual(arrivals, ["first", "second", "third"])
        self.assertEqual(runner.queued_requests, 0)
        self.assertFalse(runner.execution_slot.locked())

    async def test_disconnected_queued_request_releases_pending_slot(self):
        await runner.execution_slot.acquire()
        frames = asyncio.Queue()
        frames.put_nowait({"type": "http.request", "body": b"{}", "more_body": False})

        class WaitingRequest:
            receive = frames.get

        async def wait():
            async with runner.reserve_execution(WaitingRequest()):
                self.fail("Disconnected work acquired the execution slot")

        waiting = asyncio.create_task(wait())
        while runner.queued_requests < 1:
            await asyncio.sleep(0)
        frames.put_nowait({"type": "http.disconnect"})
        with self.assertRaises(runner.HTTPException) as error:
            await asyncio.wait_for(waiting, 1)
        self.assertEqual(error.exception.status_code, 499)
        self.assertEqual(runner.queued_requests, 0)
        self.assertTrue(runner.execution_slot.locked())
        runner.execution_slot.release()

    async def test_waiting_upload_keeps_later_body_frames_unread(self):
        await runner.execution_slot.acquire()
        receives = []

        class StreamingRequest:
            async def receive(self):
                receives.append(True)
                if len(receives) == 1:
                    return {
                        "type": "http.request",
                        "body": b'{"operation":',
                        "more_body": True,
                    }
                return {"type": "http.request", "body": b'"probe"}', "more_body": False}

        request = StreamingRequest()

        async def upload():
            async with runner.reserve_execution(request) as first_frame:
                return await runner.parse_job(request, first_frame)

        waiting = asyncio.create_task(upload())
        while not receives:
            await asyncio.sleep(0)
        # The remaining frame becomes readable when execution starts.
        await asyncio.sleep(0)
        self.assertEqual(len(receives), 1)
        runner.execution_slot.release()
        job = await asyncio.wait_for(waiting, 1)
        self.assertEqual(job.operation, "probe")
        self.assertEqual(len(receives), 2)


if __name__ == "__main__":
    unittest.main()
