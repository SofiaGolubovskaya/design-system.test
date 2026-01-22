import './Button.scss';

export const Button = ({ children, onClick, ...props }) => {
  return (
    <button className="button" onClick={onClick} {...props}>
      {children}
    </button>
  );
};
