import { notFound } from "next/navigation";
import ContactForm from "../../contact-form";
import { updateContact } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";

export default async function EditContactPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  const action = updateContact.bind(null, id);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">People · Edit</span>
          <h1>{contact.name}</h1>
        </div>
      </div>
      <ContactForm
        action={action}
        contact={contact}
        submitLabel="Save changes"
        cancelHref={`/dashboard/contacts/${id}`}
      />
    </>
  );
}
