# data/

Raw training datasets. The large CSVs are git-ignored; download them and place them here.

| File | Source | Used by |
|---|---|---|
| `emails.csv` | https://www.kaggle.com/datasets/subhajournal/phishingemails (columns `Email Text`, `Email Type`) | `models/train_email_model.py` |
| `sms.csv` | UCI SMS Spam Collection (5,572 messages) | `models/train_text_model.py` |
| `urls.csv` | https://www.kaggle.com/datasets/harisudhan411/phishing-and-legitimate-urls (columns `url`, `status`; raw `status=1` = legitimate) | `models/train_url_model.py` |
| `urls_augment.csv` | ~30K homepage URLs of well-known sites, all labeled legitimate. **Committed to git.** | `models/train_url_model.py` (optional) |

`urls_augment.csv` exists because the base URL dataset's legitimate class is mostly deep article links, so plain homepages were wrongly flagged. The same list seeds `models/trusted_domains.txt`.
