import '../styles/globals.css';
import Layout from '../components/Layout';
import { AuthProvider } from '../lib/auth';

export default function App({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => <Layout>{page}</Layout>);
  return (
    <AuthProvider>
      {getLayout(<Component {...pageProps} />)}
    </AuthProvider>
  );
}
