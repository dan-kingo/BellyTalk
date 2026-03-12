import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PlusCircle, Trash2, Wrench } from "lucide-react";
import { toast } from "react-toastify";
import Layout from "../components/layout/Layout";
import Dialog from "../components/common/Dialog";
import Skeleton from "../components/common/Skeleton";
import { DoctorService, DoctorServiceMode } from "../types";
import { doctorServiceService } from "../services/doctor-service.service";

interface ServiceFormState {
  title: string;
  description: string;
  service_mode: DoctorServiceMode;
  duration_minutes: string;
  price_amount: string;
  currency: string;
  booking_buffer_minutes: string;
  is_active: boolean;
}

interface AvailabilityFormState {
  scheduleType: "weekly" | "date";
  day_of_week: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  slot_capacity: string;
}

const DEFAULT_FORM: ServiceFormState = {
  title: "",
  description: "",
  service_mode: "video",
  duration_minutes: "30",
  price_amount: "",
  currency: "ETB",
  booking_buffer_minutes: "0",
  is_active: true,
};
const DEFAULT_TIMEZONE = "UTC";

const DEFAULT_AVAILABILITY_FORM: AvailabilityFormState = {
  scheduleType: "weekly",
  day_of_week: "1",
  specific_date: "",
  start_time: "09:00",
  end_time: "10:00",
  timezone: DEFAULT_TIMEZONE,
  slot_capacity: "1",
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const MyServicesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<DoctorService[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(DEFAULT_FORM);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [availabilityForm, setAvailabilityForm] =
    useState<AvailabilityFormState>(DEFAULT_AVAILABILITY_FORM);
  const [availabilityService, setAvailabilityService] =
    useState<DoctorService | null>(null);
  const [enforceAvailabilitySetup, setEnforceAvailabilitySetup] =
    useState(false);

  const modeOptions = useMemo(
    () => ["video", "audio", "message", "in_person"] as DoctorServiceMode[],
    [],
  );

  const loadServices = async () => {
    try {
      setLoading(true);
      const result = await doctorServiceService.listMyServices();
      setServices(result);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to load your services.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const resetAvailabilityForm = () => {
    setAvailabilityForm(DEFAULT_AVAILABILITY_FORM);
    setAvailabilityError(null);
  };

  const openAvailabilityDialog = (service: DoctorService, enforce: boolean) => {
    setAvailabilityService(service);
    setEnforceAvailabilitySetup(enforce);
    resetAvailabilityForm();
    setAvailabilityDialogOpen(true);
  };

  const closeAvailabilityDialog = () => {
    if (enforceAvailabilitySetup) {
      setAvailabilityError(
        "Please add at least one availability to finish creating this service.",
      );
      return;
    }

    setAvailabilityDialogOpen(false);
    setAvailabilityService(null);
    setEnforceAvailabilitySetup(false);
    resetAvailabilityForm();
  };

  const validateAvailabilityForm = () => {
    const start = availabilityForm.start_time;
    const end = availabilityForm.end_time;

    if (!start || !end) return "Start and end time are required.";
    if (start >= end) return "End time must be later than start time.";

    const capacity = Number(availabilityForm.slot_capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return "Slot capacity must be greater than zero.";
    }

    if (availabilityForm.scheduleType === "weekly") {
      const day = Number(availabilityForm.day_of_week);
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        return "Choose a valid weekday.";
      }
    } else if (!availabilityForm.specific_date) {
      return "Specific date is required.";
    }

    return null;
  };

  const submitAvailability = async (event: React.FormEvent) => {
    event.preventDefault();
    setAvailabilityError(null);

    if (!availabilityService) {
      setAvailabilityError("No service selected for availability setup.");
      return;
    }

    const validationError = validateAvailabilityForm();
    if (validationError) {
      setAvailabilityError(validationError);
      return;
    }

    try {
      setAvailabilitySaving(true);

      await doctorServiceService.createServiceAvailability(
        availabilityService.id,
        {
          day_of_week:
            availabilityForm.scheduleType === "weekly"
              ? Number(availabilityForm.day_of_week)
              : undefined,
          specific_date:
            availabilityForm.scheduleType === "date"
              ? availabilityForm.specific_date
              : undefined,
          start_time: availabilityForm.start_time,
          end_time: availabilityForm.end_time,
          timezone: availabilityForm.timezone || DEFAULT_TIMEZONE,
          slot_capacity: Number(availabilityForm.slot_capacity),
          is_active: true,
        },
      );

      toast.success("Availability added successfully.");
      await loadServices();
      setAvailabilityDialogOpen(false);
      setAvailabilityService(null);
      setEnforceAvailabilitySetup(false);
      resetAvailabilityForm();
    } catch (err: any) {
      setAvailabilityError(
        err?.response?.data?.error || "Failed to create availability.",
      );
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const startEdit = (service: DoctorService) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      description: service.description || "",
      service_mode: service.service_mode,
      duration_minutes: String(service.duration_minutes),
      price_amount: String(service.price_amount),
      currency: service.currency || "ETB",
      booking_buffer_minutes: String(service.booking_buffer_minutes || 0),
      is_active: Boolean(service.is_active),
    });
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Service title is required.";
    if (form.title.trim().length < 2) return "Service title is too short.";
    if (form.description.trim().length < 10)
      return "Description should be at least 10 characters.";

    const duration = Number(form.duration_minutes);
    const price = Number(form.price_amount);
    const buffer = Number(form.booking_buffer_minutes);

    if (!Number.isFinite(duration) || duration <= 0)
      return "Duration must be a positive number.";
    if (!Number.isFinite(price) || price < 0)
      return "Price must be zero or greater.";
    if (!Number.isFinite(buffer) || buffer < 0)
      return "Buffer must be zero or greater.";

    if (!form.currency || form.currency.length !== 3)
      return "Currency must be a 3-letter code (e.g. ETB).";

    return null;
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        service_mode: form.service_mode,
        duration_minutes: Number(form.duration_minutes),
        price_amount: Number(form.price_amount),
        currency: form.currency.trim().toUpperCase(),
        booking_buffer_minutes: Number(form.booking_buffer_minutes),
        is_active: form.is_active,
      };

      if (editingId) {
        await doctorServiceService.updateService(editingId, payload);
        toast.success("Service updated.");
      } else {
        const createdService =
          await doctorServiceService.createService(payload);
        toast.success(
          "Service created. Add availability to publish bookable slots.",
        );
        openAvailabilityDialog(createdService, true);
      }

      resetForm();
      await loadServices();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save service.");
    } finally {
      setSaving(false);
    }
  };

  const toggleServiceStatus = async (service: DoctorService) => {
    try {
      await doctorServiceService.updateService(service.id, {
        is_active: !service.is_active,
      });
      toast.success(
        `Service ${service.is_active ? "deactivated" : "activated"}.`,
      );
      await loadServices();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to update service status.",
      );
    }
  };

  const removeService = async (serviceId: string) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;

    try {
      await doctorServiceService.deleteService(serviceId);
      toast.success("Service deleted.");
      if (editingId === serviceId) {
        resetForm();
      }
      await loadServices();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete service.");
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Services
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Create and manage consultation services shown to mothers.
          </p>

          <form className="mt-5 space-y-4" onSubmit={submitForm}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Service title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <select
                value={form.service_mode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    service_mode: event.target.value as DoctorServiceMode,
                  }))
                }
                className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {modeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={3}
              placeholder="Describe the service, expected consultation scope, and deliverables"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <input
                type="number"
                min={1}
                placeholder="Duration min"
                value={form.duration_minutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    duration_minutes: event.target.value,
                  }))
                }
                className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                value={form.price_amount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    price_amount: event.target.value,
                  }))
                }
                className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                type="text"
                maxLength={3}
                placeholder="Currency"
                value={form.currency}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currency: event.target.value }))
                }
                className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm uppercase text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                type="number"
                min={0}
                placeholder="Buffer min"
                value={form.booking_buffer_minutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    booking_buffer_minutes: event.target.value,
                  }))
                }
                className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: event.target.checked,
                  }))
                }
              />
              Active service (visible for booking)
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusCircle className="h-4 w-4" />
                {saving
                  ? editingId
                    ? "Saving..."
                    : "Creating..."
                  : editingId
                    ? "Update Service"
                    : "Create Service"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="cursor-pointer rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Existing Services
          </h2>

          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              No services yet. Create your first service above.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {service.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {service.description}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {service.service_mode} • {service.duration_minutes} min
                        • {Number(service.price_amount).toFixed(2)}{" "}
                        {service.currency}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        service.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => startEdit(service)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Wrench className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => toggleServiceStatus(service)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {service.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => openAvailabilityDialog(service, false)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Add Availability
                    </button>
                    <button
                      onClick={() => removeService(service.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <Dialog
          isOpen={availabilityDialogOpen}
          onClose={closeAvailabilityDialog}
          title="Configure Service Availability"
        >
          <form className="space-y-4" onSubmit={submitAvailability}>
            {availabilityService && (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                <p className="font-semibold">{availabilityService.title}</p>
                <p className="mt-1 text-xs opacity-90">
                  {enforceAvailabilitySetup
                    ? "Add at least one availability rule now so mothers can book this service."
                    : "Add a new availability window for this service."}
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Schedule type
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={availabilityForm.scheduleType === "weekly"}
                    onChange={() =>
                      setAvailabilityForm((prev) => ({
                        ...prev,
                        scheduleType: "weekly",
                        specific_date: "",
                      }))
                    }
                  />
                  Weekly recurring
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={availabilityForm.scheduleType === "date"}
                    onChange={() =>
                      setAvailabilityForm((prev) => ({
                        ...prev,
                        scheduleType: "date",
                      }))
                    }
                  />
                  Specific date
                </label>
              </div>
            </div>

            {availabilityForm.scheduleType === "weekly" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weekday
                </label>
                <select
                  value={availabilityForm.day_of_week}
                  onChange={(event) =>
                    setAvailabilityForm((prev) => ({
                      ...prev,
                      day_of_week: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  {WEEKDAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  value={availabilityForm.specific_date}
                  onChange={(event) =>
                    setAvailabilityForm((prev) => ({
                      ...prev,
                      specific_date: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start time
                </label>
                <input
                  type="time"
                  value={availabilityForm.start_time}
                  onChange={(event) =>
                    setAvailabilityForm((prev) => ({
                      ...prev,
                      start_time: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End time
                </label>
                <input
                  type="time"
                  value={availabilityForm.end_time}
                  onChange={(event) =>
                    setAvailabilityForm((prev) => ({
                      ...prev,
                      end_time: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
               <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
  Timezone
</label>
<input
  type="text"
  value={availabilityForm.timezone}
  readOnly
  className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
/>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Slot capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={availabilityForm.slot_capacity}
                  onChange={(event) =>
                    setAvailabilityForm((prev) => ({
                      ...prev,
                      slot_capacity: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            {availabilityError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                {availabilityError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAvailabilityDialog}
                disabled={availabilitySaving}
                className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={availabilitySaving}
                className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
              >
                {availabilitySaving ? "Saving..." : "Save Availability"}
              </button>
            </div>
          </form>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MyServicesPage;
