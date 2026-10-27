import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Footer, Header, ScrollTop, Toast } from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Bookings from './pages/Bookings';
import Admin from './pages/Admin';

function SiteRoutes() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/store/:id" element={<Shop />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollTop />
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<SiteRoutes />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}
