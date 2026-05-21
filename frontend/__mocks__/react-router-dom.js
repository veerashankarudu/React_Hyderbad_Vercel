const React = require('react');

const MemoryRouter = ({ children }) => React.createElement('div', null, children);
const Navigate = ({ to }) => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to });
const Route = ({ element }) => element;
const Routes = ({ children }) => React.createElement('div', null, children);
const BrowserRouter = ({ children }) => React.createElement('div', null, children);
const Link = ({ children, to }) => React.createElement('a', { href: to }, children);
const NavLink = ({ children, to }) => React.createElement('a', { href: to }, children);
const Outlet = () => null;
const useNavigate = () => jest.fn();
const useLocation = () => ({ pathname: '/', search: '', hash: '', state: null });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), jest.fn()];

module.exports = {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
};
