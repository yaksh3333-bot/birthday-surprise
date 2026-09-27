import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Camera, Check, ChevronLeft, ChevronRight, Cloud, Heart, Loader2, Lock, Music2, Pause, Pencil, Play, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const fallbackPhotos = [
  { url: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1000&q=85", caption: "Sunshine and smiles" },
  { url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=85", caption: "The sweetest days" },
  { url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=85", caption: "Family, always" },
  { url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85", caption: "Together is the best place" },
  { url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1000&q=85", caption: "Little adventures" },
  { url: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=1000&q=85", caption: "A little magic" },
];

const defaultWelcome = "Today is all about you, your laughter, and the wonderful memories we share.";
const defaultLetter = "Happy Birthday! Thank you for filling our lives with warmth, laughter, guidance, and unconditional love. You make ordinary days feel special, and we are so lucky to have you. May this new year bring you endless joy, beautiful adventures, good health, and every dream your heart holds.";

type EditorForm = { recipientName: string; welcomeMessage: string; letterMessage: string; signoff: string };

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data, isLoading, refetch } = trpc.birthday.get.useQuery(undefined, { refetchInterval: 30000 });
  const update = trpc.birthday.update.useMutation();
  const upload = trpc.birthday.upload.useMutation();
  const clearMedia = trpc.birthday.clearMedia.useMutation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<EditorForm>({ recipientName: "Big Sis", welcomeMessage: defaultWelcome, letterMessage: defaultLetter, signoff: "Your family" });
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);

  const page = data?.page;
  const photos = useMemo(() => data?.media?.length ? data.media.map(item => ({ url: item.url, caption: item.caption })) : fallbackPhotos, [data?.media]);
  const name = page?.recipientName || "Big Sis";
  const welcome = page?.welcomeMessage || data?.defaults.welcomeMessage || defaultWelcome;
  const letter = page?.letterMessage || data?.defaults.letterMessage || defaultLetter;
  const signoff = page?.signoff || "Your family";
  const heroImage = page?.heroImageUrl || photos[0]?.url || fallbackPhotos[0].url;
  const videoUrl = page?.videoUrl;
  const musicUrl = page?.musicUrl;
  const isOwner = Boolean(user && (user.role === "admin"));

  useEffect(() => {
    if (!page) return;
    setForm({ recipientName: page.recipientName, welcomeMessage: page.welcomeMessage || defaultWelcome, letterMessage: page.letterMessage || defaultLetter, signoff: page.signoff });
  }, [page]);

  const openEditor = () => {
    setStatus("");
    if (!isAuthenticated) { startLogin(); return; }
    setEditorOpen(true);
  };

  const saveChanges = async () => {
    if (!isOwner) { setStatus("Only the page owner can make changes."); return; }
    setStatus("Saving your changes online…");
    try {
      let heroImageUrl = page?.heroImageUrl || undefined;
      let videoUrl = page?.videoUrl || undefined;
      let musicUrl = page?.musicUrl || undefined;
      if (heroFile) heroImageUrl = (await upload.mutateAsync({ dataUrl: await fileToDataUrl(heroFile), kind: "hero", sortOrder: 0 })).url;
      if (videoFile) videoUrl = (await upload.mutateAsync({ dataUrl: await fileToDataUrl(videoFile), kind: "video", sortOrder: 0 })).url;
      if (musicFile) musicUrl = (await upload.mutateAsync({ dataUrl: await fileToDataUrl(musicFile), kind: "music", sortOrder: 0 })).url;
      await update.mutateAsync({ ...form, heroImageUrl, videoUrl, musicUrl });
      if (galleryFiles.length) {
        await clearMedia.mutateAsync();
        for (let index = 0; index < galleryFiles.length; index += 1) {
          const file = galleryFiles[index];
          await upload.mutateAsync({ dataUrl: await fileToDataUrl(file), kind: "gallery", sortOrder: index, caption: file.name.replace(/\.[^.]+$/, "") || "A favorite memory" });
        }
      }
      await refetch();
      setHeroFile(null); setGalleryFiles([]); setVideoFile(null); setMusicFile(null);
      setStatus("Saved online. Everyone will see the update on their next refresh.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong while saving.");
    }
  };

  const playMusic = async () => {
    if (!musicUrl) { setStatus("Add background music from Customize first."); setEditorOpen(true); return; }
    const audio = document.getElementById("birthday-audio") as HTMLAudioElement | null;
    if (!audio) return;
    if (audio.paused) { await audio.play(); setMusicPlaying(true); } else { audio.pause(); setMusicPlaying(false); }
  };

  const selected = selectedPhoto === null ? null : photos[selectedPhoto];
  const previousPhoto = () => setSelectedPhoto(selectedPhoto === null ? 0 : (selectedPhoto - 1 + photos.length) % photos.length);
  const nextPhoto = () => setSelectedPhoto(selectedPhoto === null ? 0 : (selectedPhoto + 1) % photos.length);

  return <div className="min-h-screen overflow-x-hidden bg-[#fffaf5] text-[#382b31]">
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
      <a href="#top" className="font-bold tracking-tight text-[#7d3852]">A Birthday Surprise</a>
      <nav className="hidden items-center gap-2 sm:flex" aria-label="Main navigation">
        <a href="#memories" className="rounded-full px-3 py-2 text-sm text-[#715e66] hover:bg-[#fbe6ec]">Memories</a>
        <a href="#letter" className="rounded-full px-3 py-2 text-sm text-[#715e66] hover:bg-[#fbe6ec]">Letter</a>
        <Button variant="outline" size="sm" onClick={openEditor}><Pencil className="mr-2 h-4 w-4" /> Customize</Button>
      </nav>
    </header>

    <main id="top">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_10%,#fff_0_5%,transparent_28%),linear-gradient(135deg,#f8dce4,#fff4e6_60%,#eee7fa)] px-5 pb-20 pt-10 text-center">
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a94e6d]">A little celebration for someone special</p>
          <h1 className="mt-5 font-serif text-6xl leading-[.98] text-[#7d3852] sm:text-8xl">Happy Birthday,<br /><span>{name}</span>!</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#715e66]">{welcome}</p>
          <img className="mx-auto mt-7 h-64 w-full max-w-lg rotate-[-1deg] rounded-3xl border-8 border-white object-cover shadow-[0_18px_50px_rgba(82,43,57,.14)]" src={heroImage} alt="Birthday celebration" />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild><a href="#memories">See the memories <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
            <Button size="lg" variant="outline" onClick={openEditor}><Sparkles className="mr-2 h-4 w-4" /> Make it personal</Button>
          </div>
          {authLoading ? <p className="mt-5 text-sm text-[#715e66]">Loading your editor…</p> : !isAuthenticated ? <p className="mt-5 text-sm text-[#715e66]"><Lock className="mr-1 inline h-3.5 w-3.5" /> The page owner can sign in to edit this surprise.</p> : null}
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-6xl px-5 relative z-10" aria-label="How to use this page">
        <div className="grid gap-4 md:grid-cols-3">
          {[{n:"1",title:"Make it yours",text:"Tap Customize to add a name, message, and your own photos."},{n:"2",title:"Look around",text:"Scroll through the memories and tap a photo to see it bigger."},{n:"3",title:"Share the link",text:"Send this page to family. Everyone will see the same saved version."}].map(item => <article key={item.n} className="rounded-2xl bg-white p-5 shadow-[0_12px_35px_rgba(82,43,57,.12)]"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#fbe6ec] font-bold text-[#7d3852]">{item.n}</span><h2 className="mt-3 font-serif text-xl text-[#7d3852]">{item.title}</h2><p className="mt-1 text-sm text-[#715e66]">{item.text}</p></article>)}
        </div>
      </section>

      <section id="memories" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto mb-8 max-w-2xl text-center"><h2 className="font-serif text-4xl text-[#7d3852]">Our favorite memories</h2><p className="mt-2 text-[#715e66]">{isLoading ? "Loading the shared memories…" : "These photos are saved online, so the same memories appear on every device."}</p></div>
        {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#a94e6d]" /></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{photos.map((photo, index) => <button key={`${photo.url}-${index}`} onClick={() => setSelectedPhoto(index)} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-[#f1dce3] focus:outline-none focus:ring-2 focus:ring-[#a94e6d]"><img src={photo.url} alt={photo.caption} className="h-44 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-56" /><span className="block px-3 py-3 text-sm font-semibold text-[#7d3852]">{photo.caption}</span></button>)}</div>}
        <div className="mt-7 flex justify-center"><Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh shared content</Button></div>
      </section>

      <section className="bg-gradient-to-br from-[#fff4ed] via-[#f8eaf0] to-[#f0ebfb] px-5 py-20"><div className="mx-auto max-w-6xl"><div className="mx-auto mb-8 max-w-2xl text-center"><h2 className="font-serif text-4xl text-[#7d3852]">Little moments, big smiles</h2><p className="mt-2 text-[#715e66]">A few highlights worth remembering forever.</p></div><div className="grid gap-5 md:grid-cols-3">{photos.slice(0, 3).map((photo, index) => <article key={`highlight-${photo.url}`} className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(82,43,57,.10)]"><img src={photo.url} alt={photo.caption} className="h-52 w-full object-cover" /><div className="p-5"><h3 className="font-serif text-2xl text-[#7d3852]">{["The sweetest days", "Family, always", "A little magic"][index]}</h3><p className="mt-1 text-[#715e66]">{photo.caption} — a moment to keep forever.</p></div></article>)}</div></div></section>

      <section id="letter" className="mx-auto max-w-4xl px-5 py-20 text-center"><div className="mb-8"><h2 className="font-serif text-4xl text-[#7d3852]">A little letter for you</h2><p className="mt-2 text-[#715e66]">There is a special message waiting inside.</p></div><div className="rounded-3xl border border-[#f1dce3] bg-white p-7 shadow-[0_12px_35px_rgba(82,43,57,.12)] sm:p-10"><Button size="lg" onClick={() => setLetterOpen(!letterOpen)}>{letterOpen ? <X className="mr-2 h-4 w-4" /> : <Heart className="mr-2 h-4 w-4" />}{letterOpen ? "Close the birthday letter" : "Open the birthday letter"}</Button>{letterOpen && <div className="mx-auto mt-7 max-w-2xl border-t border-[#f1dce3] pt-6 text-left leading-8 text-[#715e66]"><h3 className="font-serif text-2xl text-[#7d3852]">To our dearest {name},</h3><p className="mt-4 whitespace-pre-line">{letter}</p><p className="mt-4">Keep shining just as you are. We love you more than words can say.</p><p className="mt-4">With all our love,<br /><strong className="text-[#7d3852]">{signoff}</strong></p></div>}</div></section>

      {videoUrl && <section className="bg-[#f8eaf0] px-5 py-20"><div className="mx-auto max-w-4xl text-center"><h2 className="font-serif text-4xl text-[#7d3852]">Birthday video</h2><video className="mx-auto mt-7 aspect-video w-full rounded-2xl bg-[#2d2028] object-contain" controls src={videoUrl} /><p className="mt-3 text-sm text-[#715e66]">A special message from the people who love you.</p></div></section>}
    </main>

    <footer className="bg-[#f5e1e8] px-5 py-14 text-center text-[#805063]"><h2 className="font-serif text-3xl text-[#7d3852]">Make a wish!</h2><p className="mt-2">Made with love by {signoff}</p><a className="mt-4 inline-block underline" href="#top">Back to the top</a></footer>

    <div className="fixed bottom-4 left-4 right-4 z-20 flex justify-between sm:left-auto sm:right-5 sm:w-auto sm:justify-end sm:gap-3"><Button className="rounded-full shadow-lg" onClick={openEditor}><Pencil className="mr-2 h-4 w-4" /> Customize</Button><Button className="h-11 w-11 rounded-full p-0 shadow-lg" variant="outline" onClick={playMusic} title={musicPlaying ? "Pause music" : "Play music"}>{musicPlaying ? <Pause className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}</Button></div>
    <audio id="birthday-audio" loop src={musicUrl || undefined} onEnded={() => setMusicPlaying(false)} />

    {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#170f18]/95 p-5" role="dialog" aria-modal="true" aria-label="Large memory photo" onClick={event => { if (event.target === event.currentTarget) setSelectedPhoto(null); }}><Button variant="ghost" className="absolute right-4 top-4 h-11 w-11 rounded-full p-0 text-2xl text-white hover:bg-white/20 hover:text-white" onClick={() => setSelectedPhoto(null)} aria-label="Close photo"><X /></Button><Button variant="ghost" className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full p-0 text-3xl text-white hover:bg-white/20 hover:text-white" onClick={previousPhoto} aria-label="Previous photo"><ChevronLeft /></Button><img className="max-h-[78vh] max-w-[88vw] rounded-xl object-contain" src={selected.url} alt={selected.caption} /><Button variant="ghost" className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full p-0 text-3xl text-white hover:bg-white/20 hover:text-white" onClick={nextPhoto} aria-label="Next photo"><ChevronRight /></Button><p className="absolute bottom-5 max-w-[85vw] text-center text-white">{selected.caption}</p></div>}

    {editorOpen && <div className="fixed inset-0 z-30 overflow-y-auto bg-[#1e1118]/75 p-4" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="mx-auto my-6 max-w-2xl rounded-3xl bg-[#fffaf5] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><h2 id="editor-title" className="font-serif text-3xl text-[#7d3852]">Make this page yours</h2><p className="mt-2 text-sm text-[#715e66]">Your changes will be saved online and shared with everyone who opens this link.</p></div><Button variant="ghost" size="icon" onClick={() => setEditorOpen(false)} aria-label="Close editor"><X /></Button></div>{!isOwner ? <div className="mt-7 rounded-2xl bg-[#fbe6ec] p-5 text-[#7d3852]"><Lock className="mb-2 h-5 w-5" /><p className="font-semibold">This editor belongs to the page owner.</p><p className="mt-1 text-sm">Please sign in with the owner account to change the birthday page.</p>{!isAuthenticated && <Button className="mt-4" onClick={startLogin}>Sign in to edit</Button>}</div> : <><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-[#7d3852]">Birthday person’s name<input className="mt-1 w-full rounded-xl border border-[#dfc5ce] bg-white px-3 py-3 font-normal text-[#382b31]" value={form.recipientName} onChange={event => setForm({ ...form, recipientName: event.target.value })} placeholder="For example: Priya" /></label><label className="text-sm font-semibold text-[#7d3852]">Your name<input className="mt-1 w-full rounded-xl border border-[#dfc5ce] bg-white px-3 py-3 font-normal text-[#382b31]" value={form.signoff} onChange={event => setForm({ ...form, signoff: event.target.value })} placeholder="For example: Your family" /></label></div><label className="mt-4 block text-sm font-semibold text-[#7d3852]">Short welcome message<input className="mt-1 w-full rounded-xl border border-[#dfc5ce] bg-white px-3 py-3 font-normal text-[#382b31]" value={form.welcomeMessage} onChange={event => setForm({ ...form, welcomeMessage: event.target.value })} /></label><label className="mt-4 block text-sm font-semibold text-[#7d3852]">Birthday letter<textarea rows={6} className="mt-1 w-full rounded-xl border border-[#dfc5ce] bg-white px-3 py-3 font-normal text-[#382b31]" value={form.letterMessage} onChange={event => setForm({ ...form, letterMessage: event.target.value })} /></label><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="rounded-2xl border border-dashed border-[#d8aebb] bg-white p-4 text-sm font-semibold text-[#7d3852]"><Upload className="mb-2 h-5 w-5" />Main photo<input className="mt-2 block w-full text-sm font-normal" type="file" accept="image/*" onChange={event => setHeroFile(event.target.files?.[0] || null)} /><span className="mt-2 block text-xs font-normal text-[#715e66]">{heroFile?.name || "Choose one photo"}</span></label><label className="rounded-2xl border border-dashed border-[#d8aebb] bg-white p-4 text-sm font-semibold text-[#7d3852]"><Camera className="mb-2 h-5 w-5" />Memory photos<input className="mt-2 block w-full text-sm font-normal" type="file" accept="image/*" multiple onChange={event => setGalleryFiles(Array.from(event.target.files || []))} /><span className="mt-2 block text-xs font-normal text-[#715e66]">{galleryFiles.length ? `${galleryFiles.length} photo(s) selected` : "Choose several photos"}</span></label><label className="rounded-2xl border border-dashed border-[#d8aebb] bg-white p-4 text-sm font-semibold text-[#7d3852]">Birthday video<input className="mt-2 block w-full text-sm font-normal" type="file" accept="video/*" onChange={event => setVideoFile(event.target.files?.[0] || null)} /><span className="mt-2 block text-xs font-normal text-[#715e66]">{videoFile?.name || "Optional"}</span></label><label className="rounded-2xl border border-dashed border-[#d8aebb] bg-white p-4 text-sm font-semibold text-[#7d3852]"><Music2 className="mb-2 h-5 w-5" />Background music<input className="mt-2 block w-full text-sm font-normal" type="file" accept="audio/*" onChange={event => setMusicFile(event.target.files?.[0] || null)} /><span className="mt-2 block text-xs font-normal text-[#715e66]">{musicFile?.name || "Optional"}</span></label></div><div className="mt-6 flex flex-wrap gap-3"><Button onClick={saveChanges} disabled={update.isPending || upload.isPending || clearMedia.isPending}>{update.isPending || upload.isPending || clearMedia.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Save changes online</Button><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button></div>{status && <p className="mt-4 text-sm font-semibold text-[#7d3852]" role="status">{status}</p>}</>}</div></div>}
  </div>;
}
