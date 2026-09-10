
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { ScoreReadout } from '@/components/shared/ScoreReadout';
import { ArrowLeft, Calendar, Clock, Video } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/v1/sessions/${id}`, {
          withCredentials: true,
        });
        setSession(response.data);
      } catch (err: any) {
        console.error('Failed to fetch session', err);
        setError('Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id]);

  if (loading) {
    return (
      <div className='space-y-8 animate-pulse max-w-5xl mx-auto'>
        <Skeleton className='h-10 w-48' />
        <Skeleton className='h-[400px] w-full rounded-xl' />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[50vh] text-center'>
        <h2 className='text-2xl font-bold text-destructive mb-2'>Error</h2>
        <p className='text-muted-foreground mb-6'>{error}</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className='space-y-8 max-w-5xl mx-auto pb-12'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate('/dashboard')} className='rounded-full'>
          <ArrowLeft className='w-5 h-5' />
        </Button>
        <div>
          <h1 className='font-display font-bold text-3xl tracking-tight text-foreground'>Session Report</h1>
          <div className='flex items-center text-sm text-muted-foreground font-mono mt-1 gap-4'>
            <span className='flex items-center'><Calendar className='w-4 h-4 mr-1' /> {format(new Date(session.session_date), 'PPP')}</span>
            <span className='flex items-center'><Clock className='w-4 h-4 mr-1' /> {Math.round(session.duration_sec)} sec</span>
          </div>
        </div>
      </div>

      <div className='bg-card border border-border rounded-[1rem] p-8 shadow-sm'>
        <h2 className='font-sans font-semibold text-xl mb-6'>Performance Overview</h2>
        <ScoreReadout
          overall={session.overall_score}
          pillars={[
            { label: 'Confidence', value: session.confidence_score },
            { label: 'Fluency', value: session.fluency_score },
            { label: 'English', value: session.english_proficiency_score },
            { label: 'Impact', value: session.communication_impact_score },
            { label: 'Engagement', value: session.vocal_engagement_score },
            { label: 'Presence', value: session.physical_presence_score },
          ]}
        />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        {/* Left Column: LLM Report */}
        <div className='bg-card border border-border rounded-[1rem] p-8 shadow-sm max-w-none'>
          <h2 className='font-sans font-semibold text-xl mb-6 text-foreground'>AI Coach Feedback</h2>
          <div className='text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans text-sm'>
            {session.llm_report}
          </div>
        </div>

        {/* Right Column: Transcription & Metrics */}
        <div className='space-y-8'>
          <div className='bg-card border border-border rounded-[1rem] p-8 shadow-sm'>
            <h2 className='font-sans font-semibold text-xl mb-6'>Raw Metrics</h2>
            <div className='grid grid-cols-2 gap-y-6 gap-x-4 font-mono text-sm'>
              <div>
                <p className='text-muted-foreground text-xs uppercase mb-1'>Speaking Pace</p>
                <p className='font-medium text-lg'>{session.wpm} <span className='text-xs text-muted-foreground'>WPM</span></p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs uppercase mb-1'>Filler Words</p>
                <p className='font-medium text-lg'>{session.fillers} <span className='text-xs text-muted-foreground'>total</span></p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs uppercase mb-1'>Eye Contact</p>
                <p className='font-medium text-lg'>{session.eye_contact_pct}%</p>
              </div>
              <div>
                <p className='text-muted-foreground text-xs uppercase mb-1'>Video Duration</p>
                <p className='font-medium text-lg'>{Math.round(session.duration_sec)}s</p>
              </div>
            </div>
          </div>

          <div className='bg-card border border-border rounded-[1rem] p-8 shadow-sm'>
            <h2 className='font-sans font-semibold text-xl mb-6'>Transcription</h2>
            <p className='text-muted-foreground leading-relaxed italic'>
              {session.transcription || 'No transcription available for this session.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

