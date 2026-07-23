ALTER TABLE "project_members" ADD COLUMN "profileId" uuid;--> statement-breakpoint
ALTER TABLE "travel_projects" ADD COLUMN "editToken" varchar(32);--> statement-breakpoint
-- 기존 프로젝트의 소유자 본인 멤버 행에 profileId를 채워서, 새 접근 권한 모델(projectId+profileId 조합)에서도
-- 계속 자기 프로젝트에 접근할 수 있도록 한다.
UPDATE "project_members" pm SET "profileId" = tp."userId"
FROM "travel_projects" tp
WHERE pm."projectId" = tp.id AND pm."isMe" = true AND pm."profileId" IS NULL;