import React from 'react';
import { 
  Calculator, Zap, FlaskConical, Dna, Laptop, 
  Languages, BookOpen, Landmark, Compass, Scale, 
  Cpu, Shield, Layers, LucideIcon
} from 'lucide-react';

interface SubjectIconProps {
  name: string;
  className?: string;
}

export default function SubjectIcon({ name, className = 'h-5 w-5' }: SubjectIconProps) {
  const n = (name || '').toLowerCase();

  if (n.includes('toán')) {
    return <Calculator className={className} />;
  }
  if (n.includes('vật lý') || n.includes('vật lí') || n.includes('lý') || n.includes('lí')) {
    return <Zap className={className} />;
  }
  if (n.includes('hóa')) {
    return <FlaskConical className={className} />;
  }
  if (n.includes('sinh')) {
    return <Dna className={className} />;
  }
  if (n.includes('tin') || n.includes('cntt')) {
    return <Laptop className={className} />;
  }
  if (n.includes('anh') || n.includes('english') || n.includes('ngoại ngữ')) {
    return <Languages className={className} />;
  }
  if (n.includes('văn') || n.includes('ngữ văn')) {
    return <BookOpen className={className} />;
  }
  if (n.includes('sử') || n.includes('lịch sử')) {
    return <Landmark className={className} />;
  }
  if (n.includes('địa') || n.includes('địa lí') || n.includes('địa lý')) {
    return <Compass className={className} />;
  }
  if (n.includes('kinh tế') || n.includes('pháp luật') || n.includes('ktpl') || n.includes('gdcd')) {
    return <Scale className={className} />;
  }
  if (n.includes('công nghệ') || n.includes('cn')) {
    return <Cpu className={className} />;
  }
  if (n.includes('quốc phòng') || n.includes('gdqp')) {
    return <Shield className={className} />;
  }

  return <Layers className={className} />;
}
