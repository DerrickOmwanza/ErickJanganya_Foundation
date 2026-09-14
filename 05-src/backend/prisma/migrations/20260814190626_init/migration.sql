-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracker_projects" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress_percent" INTEGER DEFAULT 0,
    "budget_kes" INTEGER,
    "funding_source" TEXT,
    "summary" TEXT,
    "location" TEXT,
    "photo_url" TEXT,
    "started_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracker_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promises" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date_made" DATE,
    "target_date" DATE,
    "description" TEXT,
    "evidence_note" TEXT,
    "linked_project_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT,
    "published_on" DATE NOT NULL,
    "source_type" TEXT NOT NULL,
    "external_url" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" DATE NOT NULL,
    "event_time" TEXT,
    "location" TEXT,
    "ward" TEXT,
    "rsvp_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "caption" TEXT,
    "media_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "tags" TEXT,
    "taken_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ward" TEXT,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "tracker_projects_status_idx" ON "tracker_projects"("status");

-- CreateIndex
CREATE INDEX "tracker_projects_ward_idx" ON "tracker_projects"("ward");

-- CreateIndex
CREATE INDEX "tracker_projects_category_idx" ON "tracker_projects"("category");

-- CreateIndex
CREATE INDEX "promises_status_idx" ON "promises"("status");

-- CreateIndex
CREATE INDEX "promises_category_idx" ON "promises"("category");

-- CreateIndex
CREATE INDEX "news_posts_source_type_idx" ON "news_posts"("source_type");

-- CreateIndex
CREATE INDEX "news_posts_published_on_idx" ON "news_posts"("published_on");

-- CreateIndex
CREATE INDEX "events_ward_idx" ON "events"("ward");

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");

-- CreateIndex
CREATE INDEX "media_items_type_idx" ON "media_items"("type");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- AddForeignKey
ALTER TABLE "promises" ADD CONSTRAINT "promises_linked_project_id_fkey" FOREIGN KEY ("linked_project_id") REFERENCES "tracker_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
