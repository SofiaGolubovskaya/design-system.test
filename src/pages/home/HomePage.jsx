import { Button } from '@/shared/ui/Button';
import './HomePage.scss';

export const HomePage = () => {
  const handleClick = () => {
    alert('Button clicked!');
  };

  return (
    <div className="home-page">
      <h1>Welcome to Design System</h1>
      <Button onClick={handleClick}>Click Me</Button>
    </div>
  );
};
