import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "react-toastify";
import Layout from "../components/layout/Layout";
import Skeleton from "../components/common/Skeleton";
import { doctorDiscoveryService } from "../services/doctor-discovery.service";
import { bookingService } from "../services/booking.service";
import {
  BookingPaymentMethod,
  DoctorProfile,
  DoctorService,
  DoctorServiceAvailability,
} from "../types";

type ComputedSlot = {
  key: string;
  availabilityId: string;
  startIso: string;
  endIso: string;
  label: string;
};

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const toLocalDateTimeInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseTimeToMinutes = (time: string) => {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const toIsoUtcFromDateAndMinutes = (dateYmd: string, minutes: number) => {
  const [yearStr, monthStr, dayStr] = dateYmd.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return new Date(Date.UTC(year, month - 1, day, hours, mins, 0)).toISOString();
};

const formatSlotLabel = (startIso: string, endIso: string) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const getUpcomingDateStringsByWeekdayUtc = (
  dayOfWeek: number,
  lookaheadDays: number,
) => {
  const days: string[] = [];
  const now = new Date();
  for (let offset = 0; offset <= lookaheadDays; offset += 1) {
    const candidate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + offset,
      ),
    );
    if (candidate.getUTCDay() === dayOfWeek) {
      days.push(candidate.toISOString().slice(0, 10));
    }
  }
  return days;
};

const buildSlotsFromAvailability = (
  availabilityRows: DoctorServiceAvailability[],
  service: DoctorService | null,
) => {
  if (!service) return [] as ComputedSlot[];

  const duration = service.duration_minutes;
  const buffer = service.booking_buffer_minutes || 0;
  const step = Math.max(duration + buffer, 1);
  const nowMs = Date.now();
  const slots: ComputedSlot[] = [];

  availabilityRows.forEach((row) => {
    const startMinutes = parseTimeToMinutes(row.start_time);
    const endMinutes = parseTimeToMinutes(row.end_time);
    if (startMinutes === null || endMinutes === null) {
      return;
    }

    const dateCandidates: string[] = [];
    if (row.specific_date) {
      dateCandidates.push(row.specific_date);
    } else if (typeof row.day_of_week === "number") {
      dateCandidates.push(
        ...getUpcomingDateStringsByWeekdayUtc(row.day_of_week, 21),
      );
    }

    dateCandidates.forEach((dateYmd) => {
      for (
        let cursor = startMinutes;
        cursor + duration <= endMinutes;
        cursor += step
      ) {
        const startIso = toIsoUtcFromDateAndMinutes(dateYmd, cursor);
        const endIso = toIsoUtcFromDateAndMinutes(dateYmd, cursor + duration);

        if (new Date(startIso).getTime() <= nowMs) {
          continue;
        }

        slots.push({
          key: `${row.id}__${startIso}`,
          availabilityId: row.id,
          startIso,
          endIso,
          label: formatSlotLabel(startIso, endIso),
        });
      }
    });
  });

  return slots.sort((a, b) => a.startIso.localeCompare(b.startIso));
};

const isScheduleWithinAvailability = (
  scheduledStartIso: string,
  scheduledEndIso: string,
  availabilityRows: DoctorServiceAvailability[],
) => {
  const scheduledStart = new Date(scheduledStartIso);
  const scheduledEnd = new Date(scheduledEndIso);

  const datePart = scheduledStart.toISOString().slice(0, 10);
  const dayOfWeek = scheduledStart.getUTCDay();
  const startTime = scheduledStart.toISOString().slice(11, 19);
  const endTime = scheduledEnd.toISOString().slice(11, 19);

  return availabilityRows.some((row) => {
    const matchesDate = row.specific_date
      ? row.specific_date === datePart
      : true;
    const matchesDay =
      typeof row.day_of_week === "number"
        ? row.day_of_week === dayOfWeek
        : true;
    const withinTime = startTime >= row.start_time && endTime <= row.end_time;

    return matchesDate && matchesDay && withinTime;
  });
};

const formatAvailabilityRule = (row: DoctorServiceAvailability) => {
  const dayOrDate = row.specific_date
    ? `Date ${row.specific_date}`
    : typeof row.day_of_week === "number"
      ? WEEKDAY_LABELS[row.day_of_week] || `Day ${row.day_of_week}`
      : "Any day";

  return `${dayOrDate}: ${row.start_time} - ${row.end_time}${row.timezone ? ` (${row.timezone})` : ""}`;
};

const DoctorDetailsPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [services, setServices] = useState<DoctorService[]>([]);
  const [availability, setAvailability] = useState<DoctorServiceAvailability[]>(
    [],
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedAvailabilityId, setSelectedAvailabilityId] =
    useState<string>("");
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>("");

  const [startAt, setStartAt] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<BookingPaymentMethod>("proof_upload");
  const [patientAge, setPatientAge] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingInputError, setBookingInputError] = useState<string | null>(
    null,
  );

  const selectedService = useMemo(
    () => services.find((item) => item.id === selectedServiceId) || null,
    [services, selectedServiceId],
  );

  const computedSlots = useMemo(
    () => buildSlotsFromAvailability(availability, selectedService),
    [availability, selectedService],
  );

  const selectedSlot = useMemo(
    () => computedSlots.find((slot) => slot.key === selectedSlotKey) || null,
    [computedSlots, selectedSlotKey],
  );

  const shouldUseAvailabilitySlots = computedSlots.length > 0;

  const availabilityRules = useMemo(
    () => availability.map((row) => formatAvailabilityRule(row)),
    [availability],
  );

  const scheduledEndIso = useMemo(() => {
    const matchingSlot = computedSlots.find(
      (slot) => slot.key === selectedSlotKey,
    );
    if (matchingSlot) {
      return matchingSlot.endIso;
    }

    if (!selectedService || !startAt) return null;

    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) return null;

    const end = new Date(
      start.getTime() + selectedService.duration_minutes * 60000,
    );
    return end.toISOString();
  }, [selectedService, startAt, selectedSlotKey]);

  useEffect(() => {
    if (!doctorId) {
      navigate("/doctors");
      return;
    }

    let mounted = true;
    const loadDetails = async () => {
      try {
        setLoading(true);
        const [doctorProfile, doctorServices, doctorPresence] =
          await Promise.all([
            doctorDiscoveryService.getDoctorProfile(doctorId),
            doctorDiscoveryService.getDoctorServices(doctorId),
            doctorDiscoveryService.getDoctorsPresence([doctorId]),
          ]);

        if (!mounted) return;

        setProfile(doctorProfile);
        setServices(doctorServices);
        if (doctorServices.length > 0) {
          setSelectedServiceId(doctorServices[0].id);
        }

        if (doctorPresence.length > 0) {
          setDisplayName(doctorPresence[0].full_name || "");
        }
      } catch (err: any) {
        toast.error(
          err?.response?.data?.error || "Failed to load doctor details.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDetails();
    return () => {
      mounted = false;
    };
  }, [doctorId, navigate]);

  useEffect(() => {
    if (!selectedServiceId) {
      setAvailability([]);
      setSelectedAvailabilityId("");
      setSelectedSlotKey("");
      setBookingInputError(null);
      return;
    }

    let mounted = true;
    const loadAvailability = async () => {
      try {
        const slots =
          await doctorDiscoveryService.getServiceAvailability(
            selectedServiceId,
          );
        if (!mounted) return;
        setAvailability(slots);
        setSelectedAvailabilityId("");
        setSelectedSlotKey("");
        setBookingInputError(null);
      } catch {
        if (!mounted) return;
        setAvailability([]);
        setSelectedAvailabilityId("");
        setSelectedSlotKey("");
        setBookingInputError(null);
      }
    };

    loadAvailability();
    return () => {
      mounted = false;
    };
  }, [selectedServiceId]);

  useEffect(() => {
    if (!selectedService) return;
    if (
      selectedService.service_mode !== "in_person" &&
      paymentMethod === "cod"
    ) {
      setPaymentMethod("proof_upload");
    }
  }, [paymentMethod, selectedService]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setBookingInputError(null);

    if (!doctorId || !selectedService || !scheduledEndIso) {
      const message = "Please select a service and appointment time.";
      setBookingInputError(message);
      toast.error(message);
      return;
    }

    if (shouldUseAvailabilitySlots && !selectedSlot) {
      const message =
        "Please select one of the listed availability slots to continue.";
      setBookingInputError(message);
      toast.error(message);
      return;
    }

    const scheduledStartIso = selectedSlot
      ? selectedSlot.startIso
      : startAt
        ? new Date(startAt).toISOString()
        : "";

    const startDate = new Date(scheduledStartIso);
    if (Number.isNaN(startDate.getTime())) {
      const message = "Please choose a valid appointment date/time.";
      setBookingInputError(message);
      toast.error(message);
      return;
    }

    if (!selectedSlot && availability.length > 0) {
      const matchesAvailability = isScheduleWithinAvailability(
        scheduledStartIso,
        scheduledEndIso,
        availability,
      );

      if (!matchesAvailability) {
        const message =
          "Selected time does not match this service availability. Please choose one of the required windows shown below.";
        setBookingInputError(message);
        toast.error(message);
        return;
      }
    }

    try {
      setSaving(true);

      await bookingService.createBooking({
        doctor_id: doctorId,
        service_id: selectedService.id,
        availability_id: selectedSlot
          ? selectedSlot.availabilityId
          : selectedAvailabilityId || undefined,
        payment_method: paymentMethod,
        scheduled_start: scheduledStartIso,
        scheduled_end: scheduledEndIso,
        patient_age: patientAge ? Number(patientAge) : undefined,
        symptoms: symptoms.trim() || undefined,
        booking_notes: bookingNotes.trim() || undefined,
      });

      toast.success("Booking submitted successfully.");
      navigate("/bookings");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create booking.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          onClick={() => navigate("/doctors")}
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to doctors
        </button>

        {loading ? (
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {displayName || `Dr. ${doctorId?.slice(0, 8)}`}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {profile?.headline ||
                  "Professional care and personalized consultation."}
              </p>

              {profile?.specialties && profile.specialties.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              {profile?.bio && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {profile.bio}
                </p>
              )}
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Available Services
                </h2>

                {services.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    This doctor has no active services yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {services.map((service) => (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          setSelectedAvailabilityId("");
                          setSelectedSlotKey("");
                          setStartAt("");
                        }}
                        className={`w-full cursor-pointer rounded-xl border p-4 text-left transition ${
                          selectedServiceId === service.id
                            ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                            : "border-gray-200 hover:border-primary/40 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {service.title}
                            </h3>
                            {service.description && (
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1 text-right text-sm">
                            <p className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-200">
                              <CircleDollarSign className="h-4 w-4" />
                              {Number(service.price_amount).toFixed(2)}{" "}
                              {service.currency}
                            </p>
                            <p className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <Clock className="h-4 w-4" />
                              {service.duration_minutes} mins
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedService && availabilityRules.length > 0 && (
                  <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
                    <p className="font-semibold">Service availability rules</p>
                    <ul className="mt-2 space-y-1">
                      {availabilityRules.map((rule, index) => (
                        <li key={`${rule}-${index}`}>- {rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Book Consultation
                </h2>

                <form className="mt-4 space-y-4" onSubmit={submitBooking}>
                  {bookingInputError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                      {bookingInputError}
                    </div>
                  )}

                  {shouldUseAvailabilitySlots ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Availability slot
                      </label>
                      <select
                        value={selectedSlotKey}
                        onChange={(event) => {
                          const key = event.target.value;
                          setSelectedSlotKey(key);
                          setBookingInputError(null);
                          const slot = computedSlots.find(
                            (item) => item.key === key,
                          );
                          if (slot) {
                            setSelectedAvailabilityId(slot.availabilityId);
                          }
                        }}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        required
                      >
                        <option value="">Select a slot</option>
                        {computedSlots.map((slot) => (
                          <option key={slot.key} value={slot.key}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      {selectedSlot && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Selected slot: {selectedSlot.label}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Appointment start
                      </label>
                      <input
                        type="datetime-local"
                        value={startAt}
                        min={toLocalDateTimeInput(new Date())}
                        onChange={(event) => {
                          setStartAt(event.target.value);
                          setBookingInputError(null);
                        }}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        required
                      />
                      {availability.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          No concrete future slots were generated from
                          availability, so manual scheduling is enabled.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Payment method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value as BookingPaymentMethod,
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    >
                      {selectedService?.service_mode === "in_person" && (
                        <option value="cod">
                          Cash on delivery (in person)
                        </option>
                      )}
                      <option value="proof_upload">Proof upload</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Patient age (optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={patientAge}
                        onChange={(event) => setPatientAge(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div className="rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <CalendarClock className="mb-2 h-4 w-4" />
                      Duration: {selectedService?.duration_minutes ?? 0} mins
                      <br />
                      Ends at:{" "}
                      {scheduledEndIso
                        ? new Date(scheduledEndIso).toLocaleString()
                        : "-"}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Symptoms (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={symptoms}
                      onChange={(event) => setSymptoms(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Booking notes (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={bookingNotes}
                      onChange={(event) => setBookingNotes(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !selectedServiceId}
                    className="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Submitting..." : "Create Booking"}
                  </button>
                </form>
              </section>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default DoctorDetailsPage;
