import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function Card({
  children,
}: Props) {
  return (
    <div className="bg-white rounded-[32px] p-8 shadow-xl">
      {children}
    </div>
  );
}