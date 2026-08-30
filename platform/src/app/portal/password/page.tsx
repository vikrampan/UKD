import { requireActor } from "@/lib/session";
import { db } from "@/lib/db";
import { PasswordForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const actor = await requireActor();
  const user = await db.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: { mustChangePassword: true },
  });

  return (
    <div className="max-w-md">
      <h1 className="mb-1 text-2xl font-bold">पासवर्ड बदलें</h1>
      <p className="mb-8 text-ukd-mute">
        {user.mustChangePassword
          ? "यह अस्थायी पासवर्ड है। आगे बढ़ने से पहले इसे बदलना आवश्यक है।"
          : "कम से कम 12 अक्षर, जिनमें बड़ा-छोटा अक्षर और एक अंक हो।"}
      </p>
      <PasswordForm />
    </div>
  );
}
