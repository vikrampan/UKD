import { requireActor } from "@/lib/session";
import { addressableUnits } from "@/server/notices";
import { NoticeForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewNoticePage() {
  const actor = await requireActor();
  const units = await addressableUnits(actor);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">नई सूचना जारी करें</h1>
      <p className="mb-8 max-w-2xl text-ukd-mute">
        चुनी गई इकाई और उसके नीचे के सभी सक्रिय कार्यकर्ताओं को यह सूचना मिलेगी।
        कौन पढ़ चुका है और कौन नहीं — दोनों दर्ज होंगे।
      </p>
      <NoticeForm units={units} />
    </>
  );
}
