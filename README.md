# yasulin.github.io
This is my personal site. I'm surprised you found me!

## Write a diary entry

Open [/diary/write/](https://yasulin.github.io/diary/write/) and sign in with a GitHub token. Choose **Diary**, create an entry, select a date, write, and save. Saving creates the GitHub commit automatically. The site updates when its Pages deployment finishes. Open an existing entry to revise that day.

For the initial connection, create a [fine-grained token](https://github.com/settings/personal-access-tokens/new) restricted to `yasulin/yasulin.github.io`, with **Contents: Read and write**. Paste it into **Sign In Using Access Token** in the editor. No pull request, workflow, or account permissions are needed. The editor remembers it in this browser until it expires or you sign out. Do not put tokens in this repository or diary entries. The [setup guide](diary/write/setup.html) explains the steps.

The editor uses [Sveltia CMS](https://sveltiacms.app/en/docs/backends/github#access-token-quick-start), pinned to version 0.267.0. It connects to the live repository even when opened on a local preview. Entries saved to GitHub are public, including their history. Local unsaved drafts are not a private storage service.

## One-time deployment setup

After pushing these changes, open **Settings → Pages → Build and deployment → Source** in this repository and choose **GitHub Actions**. Run **Publish personal site** from the Actions tab if needed. Every subsequent push, including an entry saved from the editor, builds and publishes the site automatically. No additional hosting account or OAuth server is required.

## Local preview

Python 3.11 or newer is required; there are no package dependencies.

```sh
python3 scripts/build_site.py
python3 -m http.server 8000 --directory _site
```

The build also generates an ignored `diary/entries.json` for previews served directly from the repository root. Rebuild after editing local entry files. Run `git pull` before working locally to bring in entries written from the website.

## Diary storage

Each entry is a separate text file under `diary/entries/`, with a date in TOML front matter and the original text below it. The CMS manages these files. All 104 original records were migrated without changing their text; the build excludes unwritten placeholders from the reading index.

The build generates `_site/diary/entries.json` for the reader; it is not the source of truth and is not committed. A missing or invalid date or a duplicate day fails the build rather than publishing an ambiguous archive. Entry content is displayed as plain text, preserving all languages and line breaks.

```sh
python3 -m unittest discover -s tests
```
