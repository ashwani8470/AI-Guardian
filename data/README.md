# data/

Raw training datasets go here (not committed to git — see below).

- `emails.csv` — download from https://www.kaggle.com/datasets/subhajournal/phishingemails
  Columns: `Email Text`, `Email Type` (values: "Phishing Email" / "Safe Email")
  Used by `models/train_email_model.py`.

- `messages.csv` — UCI SMS Spam Collection (reused from the mini-project), for the
  upcoming text/SMS classifier.

- `urls.csv` — harisudhan411/phishing-and-legitimate-urls (reused from the mini-project),
  for the upcoming URL classifier.

Add `*.csv` to `.gitignore` if you don't want raw datasets committed to the repo
(they can be large and are easy to re-download).
