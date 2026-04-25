# 3D Try-On Integration Handoff

## Phase 1 Position

The 3D try-on feature is UI/API ready and intentionally waits for the client's AI/video generation service. Stylique Phase 1 does not include building a new 3D generation model from scratch.

## Existing Frontend Contract

The widget already:

- shows the 3D button only for eligible ULTIMATE-plan stores
- uploads the shopper photo
- sends the selected product image URL
- starts a backend job through `POST /api/plugin/embed-tryon-3d`
- polls `GET /api/plugin/embed-tryon-3d?operationName=...`
- renders the returned `videoUrl` in the existing 3D result container

## Backend Endpoint To Connect

### Start 3D Job

`POST /api/plugin/embed-tryon-3d`

Current inputs:

- `userImage`: shopper photo file
- `storeId`: store domain or ID
- `userId`: Stylique customer user ID
- `productImageUrl`: selected product image URL
- `productId`: inventory product ID when available

Expected response:

```json
{
  "success": true,
  "operationName": "provider-job-id"
}
```

### Poll 3D Job

`GET /api/plugin/embed-tryon-3d?operationName=provider-job-id`

Expected processing response:

```json
{
  "done": false,
  "operationName": "provider-job-id"
}
```

Expected completed response:

```json
{
  "done": true,
  "videoUrl": "https://client-ai-service.example.com/results/video.mp4",
  "operationName": "provider-job-id"
}
```

Expected failed response:

```json
{
  "done": true,
  "error": "Generation failed or timed out"
}
```

## What Client Developers Need To Replace

In `backend/src/routes/plugin.ts`, replace the current placeholder logic inside:

- `router.post('/embed-tryon-3d', ...)`
- `router.get('/embed-tryon-3d', ...)`

The replacement should:

- send the shopper photo and product image URL to the client's 3D service
- store or map the provider job ID as `operationName`
- poll the provider until a video URL is ready
- return that URL to the existing frontend contract

No frontend rewrite is required if the backend continues returning `operationName` and `videoUrl` in this shape.

