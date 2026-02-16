import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-slate-800 mb-4">404</h1>
                <p className="text-xl text-slate-600 mb-8">Page not found</p>
                <Link
                    to="/dashboard"
                    className="inline-block px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
