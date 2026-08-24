/**
 * Kategori adından kararlı bir renk tonu türetir — kategoriler kullanıcı
 * tarafından oluşturulduğu için sabit bir renk listesi yeterli olmaz.
 * Yalnızca nokta/rozet gibi küçük vurgu alanlarında kullanılır. Admin ve
 * öğretmen "Sorular" ekranları aynı görsel dili paylaşsın diye ortak.
 */
function categoryHue(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
    return hash;
}

/** Kategori noktası rengi — düşük doygunlukta, kurumsal görünümü bozmayacak tonda. */
export function catColor(name: string): string {
    return `hsl(${categoryHue(name)}, 52%, 56%)`;
}
