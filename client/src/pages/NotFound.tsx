import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plane className="w-8 h-8 text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없어요</h1>
        <p className="text-gray-500 mb-6">요청하신 페이지가 존재하지 않습니다.</p>
        <Button
          onClick={handleGoHome}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6"
        >
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
