# AWS Configuration — Stylique Virtual Try-On

## Credentials

| Variable | Where to set | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `backend/.env` | IAM user access key ID |
| `AWS_SECRET_ACCESS_KEY` | `backend/.env` | IAM user secret access key |
| `AWS_REGION` | `backend/.env` | AWS region for Rekognition API |

## Region

**Region used:** `eu-west-1` (EU Ireland)

**Reason:** Amazon Rekognition is available in this region. Choose the region closest to your backend server or your users for lowest latency.

### Rekognition-supported regions (as of 2026)

| Region | Location |
|---|---|
| `us-east-1` | N. Virginia |
| `us-east-2` | Ohio |
| `us-west-1` | N. California |
| `us-west-2` | Oregon |
| `eu-west-1` | Ireland |
| `eu-west-2` | London |
| `eu-central-1` | Frankfurt |
| `ap-south-1` | Mumbai |
| `ap-southeast-1` | Singapore |
| `ap-southeast-2` | Sydney |
| `ap-northeast-1` | Tokyo |
| `ap-northeast-2` | Seoul |

If your backend/users are in a different geography, pick the closest supported region from this list.

## IAM Policy

The IAM user needs only `rekognition:DetectLabels` permission. Minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "rekognition:DetectLabels",
      "Resource": "*"
    }
  ]
}
```

## How it works

1. When a product is synced (WooCommerce or bulk), `processProductImages()` scores each image.
2. If `AWS_ACCESS_KEY_ID` is set, real Rekognition `DetectLabels` is used.
3. If not set, a mock URL-heuristic scorer runs instead (for development).
4. The best-scoring image is stored as `tryon_image_url` and a tier (1/2/3) is assigned.

## Fallback behavior

When AWS credentials are absent, the backend logs:

```
[Images] AWS credentials not set – using mock scoring.
```

Mock scoring assigns a base score of 65 with bonuses for URL keywords like `model`, `front`, `hq`. This is sufficient for development but will not distinguish clothing photos from logos/icons in production.
