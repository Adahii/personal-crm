import ContactForm from "../contact-form";
import { createContact } from "@/app/actions";

export default function NewContactPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">People</span>
          <h1>Add a person</h1>
        </div>
      </div>
      <ContactForm
        action={createContact}
        submitLabel="Save person"
        cancelHref="/dashboard/contacts"
      />
    </>
  );
}
