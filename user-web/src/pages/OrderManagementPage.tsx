import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import Dialog from "../components/common/Dialog";
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Mail,
  Phone as PhoneIcon,
  Filter,
  Store,
  BadgeCheck,
} from "lucide-react";
import { Order } from "../types";
import { useShopStore } from "../stores/shop.store";
import { toast } from "react-toastify";
import Skeleton from "../components/common/Skeleton";
import { getRenderableImageUrl } from "../utils/image";

const OrderManagementPage: React.FC = () => {
  const { profile } = useAuth();
  const allOrders = useShopStore((state) => state.orders);
  const loading = useShopStore((state) => state.ordersLoading);
  const fetchOrders = useShopStore((state) => state.fetchOrders);
  const updateOrderStatus = useShopStore((state) => state.updateOrderStatus);
  const reviewOrderPayment = useShopStore((state) => state.reviewOrderPayment);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [reviewingOrder, setReviewingOrder] = useState(false);
  const [viewFilter, setViewFilter] = useState<"all" | "my_products">(
    "my_products",
  );
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentOrder, setSelectedPaymentOrder] =
    useState<Order | null>(null);
  const [paymentReviewStatus, setPaymentReviewStatus] = useState<
    "approved" | "rejected"
  >("approved");
  const [paymentRejectionReason, setPaymentRejectionReason] = useState("");
  const myProductOrders = useMemo(() => {
    if (!profile) return [] as Order[];

    // Backend currently allows doctors and admins to operate all orders.
    if (profile.role === "admin" || profile.role === "doctor") {
      return allOrders;
    }

    return allOrders.filter((order) =>
      (order.order_items || []).some(
        (item) => item.products?.created_by === profile.id,
      ),
    );
  }, [allOrders, profile]);

  const orders = viewFilter === "my_products" ? myProductOrders : allOrders;

  const [updateData, setUpdateData] = useState({
    order_status: "",
    tracking_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchOrders("all");
  }, [fetchOrders]);

  useEffect(() => {
    if (!profile) return;

    if (profile.role === "admin" || profile.role === "doctor") {
      setViewFilter("all");
      return;
    }

    setViewFilter("my_products");
  }, [profile]);

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdatingOrder(true);

    try {
      const response = await updateOrderStatus(selectedOrder.id, {
        order_status: updateData.order_status,
        tracking_number: updateData.tracking_number,
        notes: updateData.notes,
      });

      console.log("Update response:", response);
      toast.success("Order updated successfully.");

      setShowDialog(false);
      setSelectedOrder(null);
      setUpdateData({ order_status: "", tracking_number: "", notes: "" });
    } catch (error: any) {
      console.error("Failed to update order:", error);
      toast.error(
        error.response?.data?.error ||
          "Failed to update order. Please try again.",
      );
    } finally {
      setUpdatingOrder(false);
    }
  };

  const openUpdateDialog = (order: Order) => {
    if (isTerminalOrderStatus(order.order_status)) {
      toast.info("Delivered or cancelled orders can no longer be updated.");
      return;
    }

    if (!canUpdateOrder(order)) {
      toast.info("You do not have permission to update this order.");
      return;
    }

    setSelectedOrder(order);
    setUpdateData({
      order_status: order.order_status,
      tracking_number: order.tracking_number || "",
      notes: order.notes || "",
    });
    setShowDialog(true);
  };

  // Check if user can update a specific order
  const canUpdateOrder = (order: Order) => {
    if (!profile) return false;

    // Admin and doctor can update all orders.
    if (profile.role === "admin" || profile.role === "doctor") {
      return true;
    }

    // Counselor can only update orders containing their products.
    if (profile.role === "counselor") {
      const hasMyProducts = order.order_items?.some(
        (item) => item.products?.created_by === profile.id,
      );
      return hasMyProducts || false;
    }

    return false;
  };

  // Get products in order that belong to current user
  const getMyProductsInOrder = (order: Order) => {
    if (!profile) return [];
    return (
      order.order_items?.filter(
        (item) => item.products?.created_by === profile.id,
      ) || []
    );
  };

  const isTerminalOrderStatus = (status: string) =>
    status === "delivered" || status === "cancelled";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "confirmed":
        return <CheckCircle className="w-5 h-5" />;
      case "shipped":
        return <Truck className="w-5 h-5" />;
      case "delivered":
        return <Package className="w-5 h-5" />;
      case "cancelled":
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700";
      case "confirmed":
        return "bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-primary-300 dark:border-primary-700";
      case "shipped":
        return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700";
      case "delivered":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
      case "pending":
      case "pending_review":
      case "unpaid":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400";
      case "rejected":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
      case "failed":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400";
    }
  };

  const openPaymentReviewDialog = (
    order: Order,
    status: "approved" | "rejected",
  ) => {
    setSelectedPaymentOrder(order);
    setPaymentReviewStatus(status);
    setPaymentRejectionReason("");
    setPaymentDialogOpen(true);
  };

  const handlePaymentReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPaymentOrder) return;

    if (paymentReviewStatus === "rejected" && !paymentRejectionReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }

    try {
      setReviewingOrder(true);
      const response = await reviewOrderPayment(selectedPaymentOrder.id, {
        status: paymentReviewStatus,
        rejection_reason:
          paymentReviewStatus === "rejected"
            ? paymentRejectionReason.trim()
            : undefined,
      });

      toast.success(response.message || "Payment review updated.");
      setPaymentDialogOpen(false);
      setSelectedPaymentOrder(null);
      setPaymentRejectionReason("");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to review payment.");
    } finally {
      setReviewingOrder(false);
    }
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.order_status === statusFilter);

  if (
    !profile ||
    (profile.role !== "doctor" &&
      profile.role !== "admin" &&
      profile.role !== "counselor")
  ) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need doctor, admin, or counselor privileges to manage orders.
          </p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-8 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 rounded-lg" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-32 rounded-full" />
              </div>
              <div className="space-y-3 mt-5">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Order Management
            </h1>
          </div>
        </div>

        {/* View Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              View:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewFilter("my_products")}
                className={`px-4 py-2 rounded-lg cursor-pointer font-medium transition flex items-center gap-2 ${
                  viewFilter === "my_products"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <Store className="w-4 h-4" />
                My Products Orders
              </button>
              {(profile.role === "admin" || profile.role === "doctor") && (
                <button
                  onClick={() => setViewFilter("all")}
                  className={`px-4 py-2 cursor-pointer rounded-lg font-medium transition ${
                    viewFilter === "all"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  All Orders
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            "all",
            "pending",
            "confirmed",
            "shipped",
            "delivered",
            "cancelled",
          ].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg cursor-pointer font-medium transition ${
                statusFilter === status
                  ? "bg-primary-600 dark:bg-primary-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== "all" && (
                <span className="ml-2 text-xs">
                  ({orders.filter((o) => o.order_status === status).length})
                </span>
              )}
              {status === "all" && (
                <span className="ml-2 text-xs">({orders.length})</span>
              )}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <Package className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No orders found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {viewFilter === "my_products"
                ? "No orders containing your products yet"
                : statusFilter === "all"
                  ? "No orders have been placed yet"
                  : `No ${statusFilter} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const myProducts = getMyProductsInOrder(order);
              const canUpdate =
                canUpdateOrder(order) &&
                !isTerminalOrderStatus(order.order_status);

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </h3>
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(order.order_status)}`}
                          >
                            {getStatusIcon(order.order_status)}
                            <span className="capitalize">
                              {order.order_status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.payment_status)}`}
                        >
                          Payment: {order.payment_status}
                        </span>
                        {myProducts.length > 0 && (
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
                            Your Products: {myProducts.length}
                          </span>
                        )}
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total
                          </p>
                          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            ${order.total_price.toFixed(2)}
                          </p>
                        </div>
                        {canUpdate && (
                          <button
                            onClick={() => openUpdateDialog(order)}
                            className="bg-primary-600  hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition font-medium cursor-pointer"
                          >
                            Update Status
                          </button>
                        )}
                      </div>
                    </div>

                    {order.tracking_number && (
                      <div className="mt-4 flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Tracking:
                        </span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {order.tracking_number}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {order.profiles && (
                      <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Customer Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {order.profiles.full_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {order.profiles.email}
                            </span>
                          </div>
                          {order.profiles.phone && (
                            <div className="flex items-center gap-2">
                              <PhoneIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {order.profiles.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {order.order_items && order.order_items.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Order Items
                        </h4>
                        {order.order_items.map((item, index) => {
                          const isMyProduct =
                            item.products?.created_by === profile.id;
                          return (
                            <div
                              key={index}
                              className={`flex items-center gap-4 p-4 rounded-lg ${
                                isMyProduct
                                  ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                                  : "bg-gray-50 dark:bg-gray-900/50"
                              }`}
                            >
                              {item.products?.image_url && (
                                <img
                                  src={getRenderableImageUrl(
                                    item.products.image_url,
                                  )}
                                  alt={item.products.title}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    {item.products?.title || "Product"}
                                  </h5>
                                  {isMyProduct && (
                                    <span className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded-full">
                                      Your Product
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.quantity} × $
                                  {item.unit_price.toFixed(2)}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                ${(item.unit_price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {order.shipping_address && (
                      <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            Shipping Address
                          </h5>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {order.shipping_address.address}
                          <br />
                          {order.shipping_address.city},{" "}
                          {order.shipping_address.zipCode}
                          <br />
                          {order.shipping_address.country}
                          {order.shipping_address.phone && (
                            <>
                              <br />
                              Phone: {order.shipping_address.phone}
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    {order.notes && (
                      <div className="mt-4 p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                        <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                          Order Notes
                        </h5>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {order.payment_method === "proof_upload" && (
                      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h5 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                              <BadgeCheck className="h-4 w-4" /> Payment Proof
                            </h5>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                              Method: proof_upload • Status:{" "}
                              {order.payment_status}
                            </p>
                            {order.payment_submitted_at && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Submitted:{" "}
                                {new Date(
                                  order.payment_submitted_at,
                                ).toLocaleString()}
                              </p>
                            )}
                            {order.payment_document_url && (
                              <a
                                href={order.payment_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-sm font-medium text-primary hover:underline dark:text-primary-300"
                              >
                                Open uploaded proof
                              </a>
                            )}
                            {order.payment_rejection_reason && (
                              <p className="mt-2 text-sm text-red-600 dark:text-red-300">
                                Rejection reason:{" "}
                                {order.payment_rejection_reason}
                              </p>
                            )}
                          </div>

                          {canUpdate &&
                            (order.payment_status === "pending" ||
                              order.payment_status === "pending_review") && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    openPaymentReviewDialog(order, "approved")
                                  }
                                  className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20"
                                >
                                  Approve Payment
                                </button>
                                <button
                                  onClick={() =>
                                    openPaymentReviewDialog(order, "rejected")
                                  }
                                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                                >
                                  Reject Payment
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog
          isOpen={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            setSelectedPaymentOrder(null);
            setPaymentRejectionReason("");
          }}
          title={`${paymentReviewStatus === "approved" ? "Approve" : "Reject"} Payment #${selectedPaymentOrder?.id.substring(0, 8).toUpperCase() || ""}`}
        >
          <form onSubmit={handlePaymentReviewSubmit} className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {paymentReviewStatus === "approved"
                ? "Approving this proof will mark payment as paid and confirm the order."
                : "Rejecting this proof keeps the order pending and records your reason."}
            </p>

            {paymentReviewStatus === "rejected" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rejection reason *
                </label>
                <textarea
                  value={paymentRejectionReason}
                  onChange={(event) =>
                    setPaymentRejectionReason(event.target.value)
                  }
                  placeholder="Explain why this proof is rejected"
                  rows={3}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setSelectedPaymentOrder(null);
                  setPaymentRejectionReason("");
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewingOrder}
                className="cursor-pointer flex-1 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-60 dark:bg-primary-500 dark:hover:bg-primary-600"
              >
                {reviewingOrder
                  ? "Saving..."
                  : paymentReviewStatus === "approved"
                    ? "Approve"
                    : "Reject"}
              </button>
            </div>
          </form>
        </Dialog>

        <Dialog
          isOpen={showDialog}
          onClose={() => {
            setShowDialog(false);
            setSelectedOrder(null);
            setUpdateData({ order_status: "", tracking_number: "", notes: "" });
          }}
          title={`Update Order #${selectedOrder?.id.substring(0, 8).toUpperCase()}`}
        >
          <form onSubmit={handleUpdateOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Status *
              </label>
              <select
                value={updateData.order_status}
                onChange={(e) =>
                  setUpdateData({ ...updateData, order_status: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tracking Number
              </label>
              <input
                type="text"
                value={updateData.tracking_number}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    tracking_number: e.target.value,
                  })
                }
                placeholder="Enter tracking number"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={updateData.notes}
                onChange={(e) =>
                  setUpdateData({ ...updateData, notes: e.target.value })
                }
                placeholder="Add notes about this order..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  setSelectedOrder(null);
                  setUpdateData({
                    order_status: "",
                    tracking_number: "",
                    notes: "",
                  });
                }}
                className="flex-1 px-4 py-2 border  border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingOrder}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition font-medium cursor-pointer disabled:opacity-60"
              >
                {updatingOrder ? "Updating..." : "Update Order"}
              </button>
            </div>
          </form>
        </Dialog>
      </div>
    </Layout>
  );
};

export default OrderManagementPage;
