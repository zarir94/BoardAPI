# BoardAPI

REST API wrapper for fetching Bangladesh education board examination results and institution data from [eboardresults.com](https://eboardresults.com).

**Base URL**: `https://boardapibd.onrender.com`

---

## How It Works

> [!NOTE]
> **This service does not bypass security mechanisms.**
>
> Instead, it simulates standard browser requests to the official portal (`eboardresults.com`) using an offline pre-solved dictionary of captcha challenges covering **83.27%** of all known variants. When a request is made, the service checks the incoming captcha hash against this pre-solved dictionary (`verified-captcha.json`). If a match is found, it automatically answers the challenge, fetches the student or institution payload, parses and normalizes it, and returns clean, structured JSON.

---

## API Reference

### 1. `GET / POST /api/get-result`

Fetches individual student examination results, grades, and subject marks.

#### Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `exam` | string | **Yes** | Examination type: `jsc`, `ssc`, `hsc`, `dibs` |
| `board` | string | **Yes** | Education board code (see [Supported Boards](#supported-boards)) |
| `year` | number | **Yes** | 4-digit passing year (e.g. `2025`). Valid range: `1996` – present |
| `roll` | number | **Yes** | Candidate 6-digit roll number |
| `reg` | number | **Yes** | Candidate 10-digit registration number |
| `maxCaptchaRetry` | number | No | Max captcha retry attempts. Clamped between `10` and `500` (Default: `50`) |

#### Supported Boards

`barisal`, `chittagong`, `comilla`, `dhaka`, `dinajpur`, `jessore`, `madrasah`, `mymensingh`, `rajshahi`, `sylhet`, `tec` *(Technical)*

#### Example Requests

**GET:**
```bash
curl "https://boardapibd.onrender.com/api/get-result?exam=ssc&board=jessore&year=2025&roll=617381&reg=2213489227"
```

**POST (JSON):**
```bash
curl -X POST "https://boardapibd.onrender.com/api/get-result" \
  -H "Content-Type: application/json" \
  -d '{
    "exam": "ssc",
    "board": "jessore",
    "year": 2025,
    "roll": 617381,
    "reg": 2213489227
  }'
```

#### Example Response (200 OK)

```json
{
  "success": true,
  "data": {
    "meta": {
      "exam": "ssc",
      "year": 2025,
      "notice": null,
      "subjectFile": "ssc_sub_dhaka_2025.json",
      "config": {
        "showMarks": false,
        "totalOnly": false,
        "hideFailed": true
      }
    },
    "student": {
      "rollNo": "617381",
      "registrationNo": "2213489227",
      "name": "TANZIM KHAN ZIM",
      "fatherName": "MD. SHAMSUL ALAM KHAN",
      "motherName": "MST. TASLIMA KHATUN",
      "board": "JASHORE",
      "session": "2023-24",
      "groupLabel": "Group",
      "group": "SCIENCE",
      "type": "REGULAR",
      "gender": "Male",
      "dob": "04-10-2009",
      "institute": "Govt. Laboratory High School",
      "eiin": null,
      "thana": "KHAN JAHAN ALI",
      "zilla": "KHULNA"
    },
    "result": {
      "raw": "GPA=3.39",
      "display": "GPA=3.39",
      "gpa": 3.39,
      "isPassed": true
    },
    "assessments": {
      "main": {
        "title": "Subject-wise Grade/Marks",
        "valueColumnTitle": "Grade",
        "subjects": [
          { "rawCode": "101", "name": "BANGLA", "grade": "A" },
          { "rawCode": "107", "name": "ENGLISH", "grade": "B" },
          { "rawCode": "109", "name": "MATHEMATICS", "grade": "C" }
        ]
      }
    }
  },
  "original_response": {
    "status": 0,
    "msg": "Success",
    "res": {
      "name": "TANZIM KHAN ZIM",
      "roll_no": "617381",
      "regno": "2213489227",
      "board_name": "JASHORE",
      "res_detail": "GPA=3.39"
    }
  }
}
```

---

### 2. `GET /api/get-institutions`

Retrieves a list of institutions under a specified board and exam.

#### Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `board` | string | **Yes** | Education board code (`dhaka`, `jessore`, etc.) |
| `exam` | string | **Yes** | Examination type (`jsc`, `ssc`, `hsc`, `dibs`) |
| `year` | number | No | Passing year. If omitted, the server automatically scans backwards from the current year to find the latest available year |
| `type` | string | No | Output format: `nested` (default) or `flat` |

#### Example Requests

**Nested (Default):**
```bash
curl "https://boardapibd.onrender.com/api/get-institutions?board=jessore&exam=ssc&year=2025"
```

**Flat:**
```bash
curl "https://boardapibd.onrender.com/api/get-institutions?board=jessore&exam=ssc&year=2025&type=flat"
```

#### Example Response (Flat, 200 OK)

```json
{
  "success": true,
  "data": [
    {
      "eiin": "116970",
      "code": "",
      "name": "Baruna Bazar P. D. C. Collegiate School",
      "zilla": "KHULNA",
      "thana": "DUMURIA"
    },
    {
      "eiin": "114838",
      "code": "",
      "name": "Barabaria Secondary School",
      "zilla": "BAGERHAT",
      "thana": "CHITALMARI"
    }
  ]
}
```

---

## How to Replicate

1. **Scrape Captchas**:  
   Run `scrape.ts` to fetch and download all captcha challenge images from the upstream site:
   ```bash
   npx tsx scrape.ts
   ```

2. **Solve Captchas with AI**:  
   Populate your API keys in `ai-keys.json`, then run `solve.ts` to solve as many captchas as possible:
   ```bash
   npx tsx solve.ts
   ```

3. **Verify Captcha Solves**:  
   Run `verify.ts` to validate the answers against the live server:
   ```bash
   npx tsx verify.ts
   ```

4. **Test the Pipeline**:  
   Run `test.ts` to test live result retrieval:
   ```bash
   npx tsx test.ts
   ```
