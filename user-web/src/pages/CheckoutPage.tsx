import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  FileUp,
  Lock,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import { CartItem, Order } from "../types";
import { useShopStore } from "../stores/shop.store";
import { toast } from "react-toastify";

const MAX_PROOF_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartFromStore = useShopStore((state) => state.cartItems);
  const createOrder = useShopStore((state) => state.createOrder);

  const stateCartItems = (location.state as { cartItems?: CartItem[] } | null)
    ?.cartItems;

  const cartItems = stateCartItems?.length ? stateCartItems : cartFromStore;
  const total = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.products?.price || 0) * item.quantity,
        0,
      ),
    [cartItems],
  );

  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const [shippingData, setShippingData] = useState({
    address: "",
    city: "",
    region: "",
    zipCode: "",
    country: "",
    phone: "",
  });
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "proof_upload">(
    "cod",
  );
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState("");

  const handleShippingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setShippingData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setPaymentProofFile(null);
      return;
    }

    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PROOF_FILE_SIZE) {
      toast.error("Payment proof file must be 8MB or smaller.");
      event.target.value = "";
      return;
    }

    setPaymentProofFile(file);
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!shippingData.address || !shippingData.city || !shippingData.country) {
      toast.error("Please provide a complete shipping address.");
      return;
    }

    if (paymentMethod === "proof_upload" && !paymentProofFile) {
      toast.error("Please upload payment proof before placing order.");
      return;
    }

    try {
      setProcessing(true);
      setSubmitted(false);
      setResultError(null);

      const formData = new FormData();
      formData.append(
        "shipping_address",
        JSON.stringify({
          address: shippingData.address,
          city: shippingData.city,
          country: shippingData.country,
          region: shippingData.region || undefined,
          postal_code: shippingData.zipCode || undefined,
          phone: shippingData.phone || undefined,
        }),
      );

      if (orderNotes.trim()) {
        formData.append("notes", orderNotes.trim());
      }

      formData.append("payment_method", paymentMethod);

      if (transactionReference.trim()) {
        formData.append("transaction_reference", transactionReference.trim());
      }

      if (paymentMethod === "proof_upload" && paymentProofFile) {
        formData.append("payment_document", paymentProofFile);
      }

      const order = await createOrder(formData);
      setCreatedOrder(order);
      setSubmitted(true);

      if (paymentMethod === "cod") {
        toast.success("Order placed with Cash on Delivery.");
        setTimeout(() => navigate("/orders"), 2000);
      } else {
        toast.success("Order submitted. Proof upload is under review.");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to place order. Please try again.";
      setResultError(message);
      setSubmitted(true);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (cartItems.length === 0 && !submitted) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl py-12">
          <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
            <Package className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-600" />
            <p className="mb-6 text-gray-600 dark:text-gray-400">Your cart is empty</p>
            <button
              onClick={() => navigate("/shop")}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-primary-700"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (processing) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl py-12">
          <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
            <div className="mx-auto mb-6 inline-block h-16 w-16 animate-spin rounded-full border-b-2 border-primary-600 dark:border-primary-400"></div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Submitting Order</h2>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we process your checkout.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (submitted) {
    const success = Boolean(createdOrder) && !resultError;
    const proofFlow = createdOrder?.payment_method === "proof_upload";
    const approved = createdOrder?.payment_status === "paid";
    const pendingReview = !approved && !resultError;

    return (
      <Layout>
        <div className="mx-auto max-w-2xl space-y-6 py-12">
          <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
            <div
              className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                success
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-red-100 dark:bg-red-900/20"
              }`}
            >
              {success ? (
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              )}
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              {success ? "Order Submitted" : "Checkout Failed"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {success
                ? createdOrder?.payment_method === "cod"
                  ? "Your COD order is confirmed."
                  : "Your payment proof is submitted for verification."
                : resultError || "Something went wrong during checkout."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate("/orders")}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                View Orders
              </button>
              <button
                onClick={() => navigate("/shop")}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Continue Shopping
              </button>
            </div>
          </div>

          {proofFlow && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Payment Verification Timeline</h3>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Submitted</p>
                    <p className="text-gray-600 dark:text-gray-400">Payment proof uploaded and received.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  {pendingReview ? (
                    <CircleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                  ) : approved ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Verification</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {approved ? "Payment approved." : "Under review by doctor/admin."}
                    </p>
                    {createdOrder?.payment_rejection_reason && (
                      <p className="mt-1 text-red-600 dark:text-red-300">
                        Reason: {createdOrder.payment_rejection_reason}
                      </p>
                    )}
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl py-8">
        <button
          onClick={() => navigate("/cart")}
          className="mb-6 flex items-center gap-2 text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Cart
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-6 flex items-center gap-3">
                <Truck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shipping + Payment</h2>
              </div>

              <form className="space-y-5" onSubmit={submitOrder}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    name="address"
                    value={shippingData.address}
                    onChange={handleShippingChange}
                    placeholder="Street address"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white sm:col-span-2"
                  />
                  <input
                    type="text"
                    name="city"
                    value={shippingData.city}
                    onChange={handleShippingChange}
                    placeholder="City"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    name="country"
                    value={shippingData.country}
                    onChange={handleShippingChange}
                    placeholder="Country"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    name="region"
                    value={shippingData.region}
                    onChange={handleShippingChange}
                    placeholder="Region/State (optional)"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    name="zipCode"
                    value={shippingData.zipCode}
                    onChange={handleShippingChange}
                    placeholder="Postal code (optional)"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <input
                  type="tel"
                  name="phone"
                  value={shippingData.phone}
                  onChange={handleShippingChange}
                  placeholder="Phone (optional)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />

                <textarea
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Order notes (optional)"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`rounded-xl border p-4 text-left transition ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">Cash on Delivery</p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Order confirms now, payment on delivery.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("proof_upload")}
                    className={`rounded-xl border p-4 text-left transition ${
                      paymentMethod === "proof_upload"
                        ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">Upload Payment Proof</p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Submit proof for verification.</p>
                  </button>
                </div>

                {paymentMethod === "proof_upload" && (
                  <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment proof file</label>
                    <input
                      type="file"
                      onChange={handleProofFileChange}
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    {paymentProofFile && (
                      <div className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        Selected: {paymentProofFile.name} ({Math.ceil(paymentProofFile.size / 1024)} KB)
                      </div>
                    )}
                    <input
                      type="text"
                      value={transactionReference}
                      onChange={(event) => setTransactionReference(event.target.value)}
                      placeholder="Transaction reference (optional)"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                      Proof-upload orders stay pending until reviewed.
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-700"
                >
                  <Lock className="h-5 w-5" />
                  Place Order - ${total.toFixed(2)}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Order Summary</h3>

              <div className="mb-6 max-h-64 space-y-3 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    {item.products?.image_url && (
                      <img
                        src={item.products.image_url}
                        alt={item.products.title}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.products?.title || "Product"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${(Number(item.products?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span className="font-medium text-green-600 dark:text-green-400">Free</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-xl font-bold text-gray-900 dark:border-gray-700 dark:text-white">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {paymentMethod === "proof_upload" && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                  <FileUp className="mr-1 inline h-4 w-4" />
                  Payment proof upload selected.
                </div>
              )}

              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                <CreditCard className="mr-1 inline h-4 w-4" />
                No mock payment, this submits directly to backend order flow.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
