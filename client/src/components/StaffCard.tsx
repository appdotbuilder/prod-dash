import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, MapPin, Briefcase, Calendar } from 'lucide-react';
// Note: one level deeper, so need extra ../
import type { StaffMember } from '../../../server/src/schema';

interface StaffCardProps {
  member: StaffMember;
}

export function StaffCard({ member }: StaffCardProps) {
  const isActive = member.status === 'active';
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">{member.name}</h3>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Briefcase className="h-3 w-3" />
              <span>{member.position}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-3 w-3" />
              <span>{member.department}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              <span>Added {new Date(member.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={
              isActive 
                ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' 
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200'
            }
          >
            {isActive ? '✅ Active' : '🏖️ On Vacation'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}