import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Hotel, Loader2 } from "lucide-react";
import { login as apiLogin, getMe } from '@/api/auth';
import { toast } from 'sonner';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            console.log('Attempting login with:', { email, password });
            const { data } = await apiLogin({ email, password });

            // MapIdentityApi returns { accessToken, expiresIn, ... }
            const token = data.accessToken;

            // Temporarily store token so getMe can use it (auth interceptor reads localStorage)
            localStorage.setItem('token', token);

            // Fetch real user details from backend using the new token
            let role = 'Owner'; // Default fallback
            try {
                const meResponse = await getMe();
                if (meResponse.data.roles && meResponse.data.roles.length > 0) {
                    role = meResponse.data.roles[0];
                }
            } catch (err) {
                console.error('Failed to fetch user details, falling back to default role', err);
            }

            // Create user object with REAL role from backend
            const user = {
                id: email,
                email: email,
                name: email.split('@')[0],
                role: role
            };

            login(token, user);

            setIsSubmitting(false);
            // navigate to root, let the router handle the role-based redirection
            navigate('/');
        } catch (error) {
            console.error('Login failed', error);
            setIsSubmitting(false);
            // Clean up potentially invalid token if login sequence failed
            localStorage.removeItem('token');
            toast.error('Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-none shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-slate-900 rounded-2xl">
                            <Hotel className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Hotel PMS</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the management system
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@hotel.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Button variant="link" className="px-0 font-normal text-xs" type="button">
                                    Forgot password?
                                </Button>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-2">
                        <Button
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                        <div className="text-center text-sm text-slate-500">
                            Don't have an account? Contact system administrator.
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default Login;
