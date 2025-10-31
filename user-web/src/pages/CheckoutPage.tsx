import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { shopService } from '../services/shop.service';
import Layout from '../components/layout/Layout';
import { CreditCard, Lock, ArrowLeft, MapPin, Package, CheckCircle, XCircle } from 'lucide-react';
import { CartItem } from '../types';

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, total } = location.state as { cartItems: CartItem[]; total: number } || { cartItems: [], total: 0 };

  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'processing' | 'result'>('shipping');
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; message: string; order?: any } | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  const [shippingData, setShippingData] = useState({
    address: '',
    city: '',
    zipCode: '',
    country: '',
    phone: '',
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [orderNotes, setOrderNotes] = useState('');

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingData({ ...shippingData, [name]: value });
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentData({ ...paymentData, [name]: value });
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentData({ ...paymentData, cardNumber: formatted });
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setProcessing(true);
      
      console.log('Creating order with shipping data:', shippingData);
      
      // Create the order when moving to payment step
      const orderResponse = await shopService.createOrder({
        shipping_address: shippingData,
        notes: orderNotes,
      });

      console.log('Order created successfully:', orderResponse);
      const order = orderResponse.order;
      setCreatedOrder(order);
      
      setCurrentStep('payment');
    } catch (error: any) {
      console.error('Failed to create order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createdOrder) {
      alert('No order found. Please go back and try again.');
      return;
    }

    try {
      setProcessing(true);
      setCurrentStep('processing');

      console.log('Processing payment for order:', createdOrder.id);
      
      // Step 2: Process payment for the created order
      const paymentResponse = await shopService.processPayment(createdOrder.id, 'mock');
      console.log('Payment response:', paymentResponse);

      setPaymentResult({
        success: paymentResponse.success,
        message: paymentResponse.message,
        order: paymentResponse.order
      });

      setCurrentStep('result');

      // Redirect to orders page after delay if successful
      if (paymentResponse.success) {
        setTimeout(() => {
          navigate('/orders');
        }, 3000);
      }

    } catch (error: any) {
      console.error('Payment processing failed:', error);
      
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
      }

      setPaymentResult({
        success: false,
        message: errorMessage
      });
      setCurrentStep('result');
    } finally {
      setProcessing(false);
    }
  };

  const retryPayment = () => {
    if (createdOrder) {
      setCurrentStep('payment');
      setPaymentResult(null);
    } else {
      // If no order was created, go back to shipping
      setCurrentStep('shipping');
      setPaymentResult(null);
    }
  };

  const createNewOrder = () => {
    // Reset everything and start over
    setCurrentStep('shipping');
    setPaymentResult(null);
    setCreatedOrder(null);
  };

  const goBackToShipping = () => {
    setCurrentStep('shipping');
    setPaymentResult(null);
    // Note: We keep the createdOrder since it exists in the database
    // User can choose to continue with the same order or create a new one
  };

  if (currentStep === 'result' && paymentResult) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              paymentResult.success 
                ? 'bg-green-100 dark:bg-green-900/20' 
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              {paymentResult.success ? (
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {paymentResult.success ? 'Order Placed Successfully!' : 'Payment Failed'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {paymentResult.message}
            </p>
            
            {paymentResult.success ? (
              <>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mb-4"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to orders...</p>
              </>
            ) : (
              <div className="flex gap-3 justify-center flex-wrap">
                {createdOrder ? (
                  <>
                    <button
                      onClick={retryPayment}
                      className="bg-primary-600 cursor-pointer hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition font-medium"
                    >
                      Retry Payment
                    </button>
                    <button
                      onClick={goBackToShipping}
                      className="bg-gray-600 cursor-pointer hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition font-medium"
                    >
                      Edit Shipping
                    </button>
                  </>
                ) : (
                  <button
                    onClick={createNewOrder}
                    className="bg-primary-600 cursor-pointer hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition font-medium"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => navigate('/orders')}
                  className="bg-green-600 cursor-pointer hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg transition font-medium"
                >
                  View Orders
                </button>
                <button
                  onClick={() => navigate('/cart')}
                  className="bg-orange-600 cursor-pointer hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition font-medium"
                >
                  Back to Cart
                </button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  if (currentStep === 'processing') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {createdOrder ? 'Processing Payment...' : 'Creating Order...'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {createdOrder 
                ? 'Please wait while we process your payment...'
                : 'Please wait while we create your order...'
              }
            </p>
            {createdOrder && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Order ID: {createdOrder.id.substring(0, 8).toUpperCase()}
              </p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  if (cartItems.length === 0 && currentStep !== 'result') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your cart is empty</p>
            <button
              onClick={() => navigate('/shop')}
              className="bg-primary-600 cursor-pointer hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition font-medium"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8">
        <button
          onClick={() => {
            if (currentStep === 'payment') {
              setCurrentStep('shipping');
            } else {
              navigate('/cart');
            }
          }}
          className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          {currentStep === 'payment' ? 'Back to Shipping' : 'Back to Cart'}
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep === 'shipping' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep === 'shipping' ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                1
              </div>
              <span className="font-medium">Shipping</span>
            </div>
            <div className="w-24 h-1 bg-gray-300 dark:bg-gray-700"></div>
            <div className={`flex items-center gap-2 ${currentStep === 'payment' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep === 'payment' ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                2
              </div>
              <span className="font-medium">Payment</span>
            </div>
          </div>
        </div>

        {createdOrder && currentStep === 'payment' && (
          <div className="mb-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                  Order Created Successfully
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400">
                  Order ID: {createdOrder.id.substring(0, 8).toUpperCase()} • Total: ${createdOrder.total_price.toFixed(2)}
                </p>
              </div>
              <span className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-200 rounded-full">
                Ready for Payment
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {currentStep === 'shipping' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shipping Address</h2>
                </div>

                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={shippingData.address}
                      onChange={handleShippingChange}
                      placeholder="123 Main Street, Apt 4B"
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={shippingData.city}
                        onChange={handleShippingChange}
                        placeholder="New York"
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={shippingData.zipCode}
                        onChange={handleShippingChange}
                        placeholder="10001"
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={shippingData.country}
                      onChange={handleShippingChange}
                      placeholder="United States"
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={shippingData.phone}
                      onChange={handleShippingChange}
                      placeholder="+1 (555) 123-4567"
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Order Notes (Optional)
                    </label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Special delivery instructions..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full cursor-pointer bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Creating Order...
                      </>
                    ) : (
                      'Continue to Payment'
                    )}
                  </button>
                </form>
              </div>
            )}

            {currentStep === 'payment' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Information</h2>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Demo Payment:</strong> This is a mock payment system. Use any card details. 
                    Payment has an 80% success rate for testing purposes.
                  </p>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={paymentData.cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      name="cardName"
                      value={paymentData.cardName}
                      onChange={handlePaymentChange}
                      placeholder="John Doe"
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        name="expiryDate"
                        value={paymentData.expiryDate}
                        onChange={handlePaymentChange}
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        name="cvv"
                        value={paymentData.cvv}
                        onChange={handlePaymentChange}
                        placeholder="123"
                        maxLength={3}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full cursor-pointer bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Complete Payment - ${createdOrder?.total_price?.toFixed(2) || total.toFixed(2)}
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Your payment information is secure and encrypted
                  </p>
                </form>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    {item.products?.image_url && (
                      <img
                        src={item.products.image_url}
                        alt={item.products.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {item.products?.title || 'Product'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Qty: {item.quantity}
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white font-semibold">
                        ${((item.products?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {createdOrder && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Order Reference: <span className="font-mono">{createdOrder.id.substring(0, 8).toUpperCase()}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;