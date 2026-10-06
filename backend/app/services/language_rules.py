"""
Hindi / Hinglish scam rules.

The text model is trained on English SMS only, so a Hindi (Devanagari) message
is invisible to it: every character is stripped and the model just returns its
"safe" prior. This module adds a small rule layer on top of the ML score:

  * if the message is Hindi or Hinglish and trips several classic scam signals
    (urgency + account threat + OTP/KYC ask + prize bait + link), the score is
    raised and the matching signals are returned as reason codes;
  * if the message is mostly non-Latin text and nothing is recognised, we do NOT
    claim it is safe - we return a low-confidence "can't check this language
    properly" result instead.

It is deliberately simple and keyword based - a stop-gap until a multilingual
model is trained. Add words to GROUPS to extend it.
"""

import re

# Signal group -> (label shown to the user, Hindi-script keywords, Latin/Hinglish keywords)
GROUPS = {
    "urgency": (
        "Urgent or pressuring language",
        ["तुरंत", "अभी", "जल्दी", "24 घंटे", "आज ही", "अंतिम"],
        ["turant", "abhi", "jaldi", "urgent", "immediately", "last chance", "aaj hi"],
    ),
    "threat": (
        "Threatens to block or close your account",
        ["खाता बंद", "खाता ब्लॉक", "खाते को बंद", "ब्लॉक", "बंद हो जाएगा", "सस्पेंड", "निलंबित"],
        ["khata band", "account band", "band ho jayega", "band ho jaega", "block ho", "blocked", "suspend"],
    ),
    "credentials": (
        "Asks for OTP, PIN, KYC or ID details",
        ["ओटीपी", "पिन", "केवाईसी", "केवाइसी", "पासवर्ड", "आधार", "पैन कार्ड", "सीवीवी", "कार्ड नंबर"],
        ["otp", "kyc", "upi pin", "pin number", "cvv", "password", "aadhaar", "aadhar", "pan card", "card number"],
    ),
    "bait": (
        "Prize, lottery, cashback or refund bait",
        ["इनाम", "लॉटरी", "जीत", "बधाई", "रिफंड", "कैशबैक", "पुरस्कार", "मुफ्त", "मुफ़्त"],
        ["inaam", "inam", "lottery", "jeeta", "jeet", "badhai", "refund", "cashback", "free gift", "prize"],
    ),
    "link": (
        "Pushes you to click a link or call a number",
        ["लिंक", "क्लिक", "कॉल करें", "संपर्क करें"],
        ["link", "click", "call karein", "call kare", "http", "www."],
    ),
}

# Everyday Hinglish words - two or more of these (in Latin script) mean the
# message is Hindi written in English letters, so the keyword rules apply.
_HINGLISH_MARKERS = {
    "aapka", "aapke", "aapki", "hai", "hain", "hoga", "hoge", "jayega", "jayegi",
    "karein", "kare", "kijiye", "kripya", "abhi", "turant", "jaldi", "nahi", "khata",
    "khate", "paisa", "paise", "inaam", "badhai", "jeeta", "jeet", "rupaye", "apna",
    "apne", "ke", "liye", "ko", "se", "mein", "par", "band", "ho",
}
_STRONG_HINGLISH = {
    "aapka", "aapke", "aapki", "hoga", "hoge", "jayega", "jayegi", "karein", "kijiye",
    "kripya", "turant", "jaldi", "khata", "khate", "inaam", "badhai", "rupaye", "paise",
}


def _letter_stats(text: str) -> tuple[int, int]:
    letters = [ch for ch in text if ch.isalpha()]
    non_latin = sum(1 for ch in letters if ord(ch) > 0x24F)
    return len(letters), non_latin


def _is_hinglish(lower: str) -> bool:
    words = set(re.findall(r"[a-z]+", lower))
    strong = len(words & _STRONG_HINGLISH)
    return strong >= 2 or (strong >= 1 and len(words & _HINGLISH_MARKERS) >= 4)


def _contains(lower: str, keyword: str) -> bool:
    if keyword.isascii() and " " not in keyword and keyword.isalpha():
        return re.search(rf"\b{re.escape(keyword)}\b", lower) is not None
    return keyword in lower


def analyse_regional_text(content: str) -> dict | None:
    """
    Returns None when the message is plain English (the ML model handles it), or:
      {"risk_score": int, "confidence": float, "reason_codes": [...], "unsupported": bool}
    """
    text = str(content)
    lower = text.lower()
    total_letters, non_latin = _letter_stats(text)
    mostly_non_latin = total_letters > 0 and non_latin / total_letters > 0.5
    has_non_latin = non_latin >= 3
    regional = has_non_latin or _is_hinglish(lower)
    if not regional:
        return None

    hits: dict[str, list[str]] = {}
    for key, (_label, hindi_words, latin_words) in GROUPS.items():
        found = [w for w in hindi_words if _contains(lower, w)]
        found += [w for w in latin_words if _contains(lower, w)]
        if found:
            hits[key] = found

    reason_codes = [
        {
            "label": GROUPS[key][0],
            "weight": 0.3,
            "detail": "Found: " + ", ".join(words[:3]),
        }
        for key, words in hits.items()
    ]

    if len(hits) >= 3:
        return {"risk_score": 85, "confidence": 0.8, "reason_codes": reason_codes, "unsupported": False}
    if len(hits) == 2:
        return {"risk_score": 60, "confidence": 0.65, "reason_codes": reason_codes, "unsupported": False}

    if mostly_non_latin:
        reason_codes.append(
            {
                "label": "This language can't be checked reliably yet",
                "weight": 0.0,
                "detail": (
                    "The checker is trained mainly on English. Don't click links or share an "
                    "OTP/PIN unless you are sure who sent this."
                ),
            }
        )
        return {"risk_score": 35, "confidence": 0.3, "reason_codes": reason_codes, "unsupported": True}

    return None
