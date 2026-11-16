import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("build_site", Path(__file__).resolve().parents[1] / "scripts/build_site.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class DiaryBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def write(self, filename, metadata, body):
        (self.directory / filename).write_text(f"+++\n{metadata}\n+++\n{body}", encoding="utf-8")

    def test_cms_dates_and_multilingual_body_round_trip(self):
        body = 'English, 日本語, 中文 🌅\n\nLine breaks, "quotes", <script> and +++ stay text.\n'
        self.write("new.md", 'date = 2026-11-17', body)
        self.write("old.md", 'date = "2024-01-01"', "A memory")
        self.assertEqual(builder.load_entries(self.directory), [
            {"date": "2024-01-01", "content": "A memory"},
            {"date": "2026-11-17", "content": body},
        ])

    def test_skips_unwritten_days(self):
        self.write("empty.md", 'date = "2024-01-01"', "empty ...")
        self.write("blank.md", 'date = "2024-01-02"', "\n  ")
        self.assertEqual(builder.load_entries(self.directory), [])

    def test_rejects_duplicate_dates_including_changed_entry_date(self):
        self.write("first.md", 'date = "2024-01-01"', "First")
        self.write("other.md", 'date = "2024-01-01"', "Second")
        with self.assertRaisesRegex(ValueError, "duplicate diary date"):
            builder.load_entries(self.directory)

    def test_rejects_invalid_entries_before_publishing(self):
        for metadata in ['date = "2024-02-30"', 'date = "1/1/2024"', 'date = 2024-01-01T10:00:00', 'title = "No date"']:
            with self.subTest(metadata=metadata):
                self.write("bad.md", metadata, "Hello")
                with self.assertRaises(ValueError):
                    builder.load_entries(self.directory)

    def test_empty_archive(self):
        self.assertEqual(builder.load_entries(self.directory), [])


if __name__ == "__main__":
    unittest.main()
