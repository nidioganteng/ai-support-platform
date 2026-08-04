-- CreateEnum
CREATE TYPE "WidgetPosition" AS ENUM ('BOTTOM_RIGHT', 'BOTTOM_LEFT');

-- CreateEnum
CREATE TYPE "BotTone" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'CONCISE');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "botName" TEXT NOT NULL DEFAULT 'AI Assistant',
ADD COLUMN     "botTone" "BotTone" NOT NULL DEFAULT 'PROFESSIONAL',
ADD COLUMN     "fallbackMessage" TEXT NOT NULL DEFAULT 'I''m sorry, I don''t have information on that. Let me connect you with a human agent.',
ADD COLUMN     "notifyEmail" TEXT,
ADD COLUMN     "notifyOnHandoff" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnNewConversation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "widgetLabel" TEXT NOT NULL DEFAULT 'Chat with us',
ADD COLUMN     "widgetPosition" "WidgetPosition" NOT NULL DEFAULT 'BOTTOM_RIGHT',
ADD COLUMN     "widgetPrimaryColor" TEXT NOT NULL DEFAULT '#6366f1';
