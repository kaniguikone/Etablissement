<?php

namespace Database\Seeders;

use App\Models\Eleve;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class PhotoEleveSeeder extends Seeder
{
    public function run(): void
    {
        $eleves = Eleve::all();
        $count  = 0;

        // Police TTF Windows
        $fontPath = 'C:/Windows/Fonts/arialbd.ttf';
        $hasTtf   = file_exists($fontPath);

        foreach ($eleves as $eleve) {
            $initiales = strtoupper(
                substr($eleve->nom_eleve, 0, 1) . substr($eleve->prenoms_eleve, 0, 1)
            );

            $couleur = $eleve->genre_eleve === 'F'
                ? ['r' => 194, 'g' => 24,  'b' => 91]
                : ['r' => 21,  'g' => 101, 'b' => 192];

            $size = 200;
            $img  = imagecreatetruecolor($size, $size);

            // Fond transparent puis cercle coloré
            imagealphablending($img, false);
            imagesavealpha($img, true);
            $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
            imagefill($img, 0, 0, $transparent);
            imagealphablending($img, true);

            $bg = imagecolorallocate($img, $couleur['r'], $couleur['g'], $couleur['b']);
            $fg = imagecolorallocate($img, 255, 255, 255);
            imagefilledellipse($img, 100, 100, $size, $size, $bg);

            if ($hasTtf) {
                $fontSize = 72;
                $bbox     = imagettfbbox($fontSize, 0, $fontPath, $initiales);
                $textW    = $bbox[2] - $bbox[0];
                $textH    = $bbox[1] - $bbox[7];
                $x        = (int)(($size - $textW) / 2);
                $y        = (int)(($size + $textH) / 2);
                imagettftext($img, $fontSize, 0, $x, $y, $fg, $fontPath, $initiales);
            } else {
                // Fallback : police intégrée agrandie par scaling
                $tmp   = imagecreatetruecolor(40, 20);
                $tbg   = imagecolorallocate($tmp, $couleur['r'], $couleur['g'], $couleur['b']);
                $tfg   = imagecolorallocate($tmp, 255, 255, 255);
                imagefill($tmp, 0, 0, $tbg);
                imagestring($tmp, 5, 2, 2, $initiales, $tfg);
                imagecopyresized($img, $tmp, 60, 75, 0, 0, 80, 50, 40, 20);
                imagedestroy($tmp);
            }

            ob_start();
            imagepng($img);
            $pngData = ob_get_clean();
            imagedestroy($img);

            $path = 'photos/eleves/' . $eleve->matricule_eleve . '.png';
            Storage::disk('public')->put($path, $pngData);
            $eleve->update(['photo_eleve' => $path]);
            $count++;
        }

        $this->command->info("{$count} photos PNG générées.");
    }
}
